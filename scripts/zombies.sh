#!/usr/bin/env bash
# zombies.sh - Find, inspect, and kill orphaned process trees
#
# Usage:
#   ./scripts/zombies.sh              # list zombies (default)
#   ./scripts/zombies.sh list         # list zombies
#   ./scripts/zombies.sh show <PID>   # show details for a specific PID
#   ./scripts/zombies.sh clear        # kill all zombies (with confirmation)
#   ./scripts/zombies.sh clear -y     # kill all zombies (no confirmation)
#   ./scripts/zombies.sh clear <PID>  # kill a specific zombie tree
set -euo pipefail

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Helpers ──

# Find children of a PID (ps-based, more reliable than pgrep on macOS)
children_of() {
  ps -eo pid=,ppid= 2>/dev/null | awk -v p="$1" '$2 == p {print $1}'
}

# Collect all descendant PIDs recursively
collect_tree() {
  local parent=$1
  while IFS= read -r child; do
    child=$(echo "$child" | tr -d ' ')
    [[ -z "$child" ]] && continue
    echo "$child"
    collect_tree "$child"
  done < <(children_of "$parent")
}

# Get listening ports for a process (comma-separated)
proc_ports() {
  local pid=$1
  lsof -iTCP -sTCP:LISTEN -P -n -a -p "$pid" 2>/dev/null | awk 'NR>1{print $9}' | sed 's/.*://' | sort -u | paste -sd',' - || true
}

# Get a short label for a process
proc_label() {
  local pid=$1
  local args
  args=$(ps -o args= -p "$pid" 2>/dev/null || echo "")

  local label=""
  if echo "$args" | grep -q 'claude.*--output-format'; then
    local sid
    sid=$(echo "$args" | grep -oE 'session-id [^ ]+' | cut -d' ' -f2 || echo "")
    if [[ -n "$sid" ]]; then
      label="claude-cli (session=${sid:0:12}…)"
    else
      label="claude-cli"
    fi
  elif echo "$args" | grep -q 'claude-code-backend/backend.mjs'; then
    label="backend.mjs"
  elif echo "$args" | grep -qE 'vite.*--(port|config)|vitest'; then
    label="dev-server (vite)"
  elif echo "$args" | grep -q 'pnpm.*dev'; then
    label="dev-server (pnpm)"
  else
    label=$(echo "$args" | cut -c1-60)
  fi

  # Append port info: check self + entire subtree
  local ports all_ports=""
  ports=$(proc_ports "$pid")
  [[ -n "$ports" ]] && all_ports="$ports"
  while IFS= read -r desc; do
    desc=$(echo "$desc" | tr -d ' ')
    [[ -z "$desc" ]] && continue
    local dp
    dp=$(proc_ports "$desc")
    [[ -n "$dp" ]] && all_ports="$all_ports $dp"
  done < <(collect_tree "$pid")
  ports=$(echo "$all_ports" | tr ' ,' '\n' | sed '/^$/d' | sort -un | paste -sd',' - || true)
  if [[ -n "$ports" ]]; then
    label="$label :$ports"
  fi

  echo "$label"
}

# ── Active session protection ──
# Walk up from $$ to find the claude process that owns this shell
find_active_claude_pid() {
  local pid=$$
  while [[ "$pid" -gt 1 ]]; do
    local cmd
    cmd=$(ps -o comm= -p "$pid" 2>/dev/null || echo "")
    if [[ "$cmd" == "claude" ]]; then
      echo "$pid"
      return
    fi
    pid=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ' || echo "1")
  done
  echo ""
}

ACTIVE_CLAUDE_PID=$(find_active_claude_pid)

PROTECTED_PIDS=""
if [[ -n "$ACTIVE_CLAUDE_PID" ]]; then
  PROTECTED_PIDS="$ACTIVE_CLAUDE_PID $(collect_tree "$ACTIVE_CLAUDE_PID")"
fi

is_protected() {
  echo "$PROTECTED_PIDS" | grep -qw "$1" 2>/dev/null || return 1
}

# ── Root process discovery ──
# Find root processes: the top-level processes related to this project.
# A "root" is a process whose parent is NOT another project-related process.
# We identify project processes by pattern, then filter to roots only.

ROOT_PIDS=()

discover_roots() {
  local all_project_pids=""

  # 1) claude CLI sessions (detached, tty=??)
  while IFS= read -r line; do
    local pid tty
    pid=$(echo "$line" | awk '{print $2}')
    tty=$(echo "$line" | awk '{print $7}')
    [[ "$tty" != "??" ]] && continue
    all_project_pids="$all_project_pids $pid"
  done < <(ps aux | grep -E 'claude\s+(-p\s+)?--output-format' | grep -v grep || true)

  # 2) backend.mjs
  while IFS= read -r line; do
    local pid
    pid=$(echo "$line" | awk '{print $2}')
    all_project_pids="$all_project_pids $pid"
  done < <(ps aux | grep 'claude-code-backend/backend.mjs' | grep -v grep || true)

  # 3) dev servers (vite on known ports, pnpm dev)
  while IFS= read -r line; do
    local pid
    pid=$(echo "$line" | awk '{print $2}')
    all_project_pids="$all_project_pids $pid"
  done < <(ps aux | grep -E '(vite.*--(port|config)|pnpm.*(dev|start))' | grep -v grep || true)

  # Filter to roots: a root's parent is NOT in the project PID set
  for pid in $all_project_pids; do
    local ppid
    ppid=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ' || echo "0")
    local is_root=true
    for other in $all_project_pids; do
      if [[ "$ppid" == "$other" ]]; then
        is_root=false
        break
      fi
    done
    if $is_root; then
      ROOT_PIDS+=("$pid")
    fi
  done
}

# ── Zombie detection ──
# A root is alive (not zombie) if:
#   - It belongs to the active claude session (protected)
#   - It's attached to a terminal (tty != ??)
#   - Its parent is a running IDE process (webstorm, idea, goland, etc.)
ZOMBIE_ROOTS=()
ZOMBIE_ALL_PIDS=()
ALIVE_ROOTS=()

is_alive_root() {
  local pid=$1

  # Protected by active session
  if is_protected "$pid"; then
    return 0
  fi

  # Attached to a terminal = user is running it interactively
  local tty
  tty=$(ps -o tty= -p "$pid" 2>/dev/null | tr -d ' ' || echo "??")
  if [[ "$tty" != "??" ]]; then
    return 0
  fi

  # Parent is a running IDE process
  local ppid parent_cmd
  ppid=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ' || echo "0")
  parent_cmd=$(ps -o comm= -p "$ppid" 2>/dev/null || echo "")
  if echo "$parent_cmd" | grep -qiE '(webstorm|idea|goland|pycharm|clion|rider|phpstorm|rubymine|datagrip|fleet)'; then
    return 0
  fi

  return 1
}

classify_roots() {
  for root in "${ROOT_PIDS[@]}"; do
    if is_alive_root "$root"; then
      ALIVE_ROOTS+=("$root")
      continue
    fi
    ZOMBIE_ROOTS+=("$root")
    ZOMBIE_ALL_PIDS+=("$root")
    while IFS= read -r child; do
      ZOMBIE_ALL_PIDS+=("$child")
    done < <(collect_tree "$root")
  done
}

# ── Commands ──

print_tree() {
  local pid=$1
  local prefix=${2:-""}
  local is_last=${3:-true}

  local label
  label=$(proc_label "$pid")
  local start
  start=$(ps -o lstart= -p "$pid" 2>/dev/null | awk '{print $2, $3, $4}' || echo "?")

  local branch="└─"
  local next_prefix="${prefix}   "
  if [[ "$is_last" == false ]]; then
    branch="├─"
    next_prefix="${prefix}│  "
  fi

  if [[ -z "$prefix" ]]; then
    # Root level
    echo -e "  ${YELLOW}PID=$pid${RESET}  $start  $label"
  else
    echo -e "  ${prefix}${branch} ${YELLOW}$pid${RESET}  $label"
  fi

  local children
  children=$(children_of "$pid")
  if [[ -n "$children" ]]; then
    local arr=()
    while IFS= read -r c; do
      c=$(echo "$c" | tr -d ' ')
      [[ -n "$c" ]] && arr+=("$c")
    done <<< "$children"

    local count=${#arr[@]}
    local i=0
    for child in "${arr[@]}"; do
      ((i++))
      if [[ $i -eq $count ]]; then
        print_tree "$child" "$next_prefix" true
      else
        print_tree "$child" "$next_prefix" false
      fi
    done
  fi
}

cmd_list() {
  discover_roots
  classify_roots

  echo -e "${BOLD}=== Zombie Process Scanner ===${RESET}"
  if [[ -n "$ACTIVE_CLAUDE_PID" ]]; then
    echo -e "${DIM}(protecting active session: PID $ACTIVE_CLAUDE_PID)${RESET}"
  fi
  echo ""

  # Show alive trees
  if [[ ${#ALIVE_ROOTS[@]} -gt 0 ]]; then
    echo -e "${GREEN}[Alive]${RESET}"
    echo "─────────────────────────────────"
    for root in "${ALIVE_ROOTS[@]}"; do
      local label reason tty ppid parent_cmd
      label=$(proc_label "$root")
      tty=$(ps -o tty= -p "$root" 2>/dev/null | tr -d ' ' || echo "??")
      if is_protected "$root"; then
        reason="active session"
      elif [[ "$tty" != "??" ]]; then
        reason="tty=$tty"
      else
        ppid=$(ps -o ppid= -p "$root" 2>/dev/null | tr -d ' ' || echo "0")
        parent_cmd=$(ps -o comm= -p "$ppid" 2>/dev/null | xargs basename 2>/dev/null || echo "?")
        reason="parent=$parent_cmd"
      fi
      echo -e "  ${GREEN}PID=$root${RESET}  $label  ${DIM}($reason)${RESET}"
    done
    echo ""
  fi

  # Show zombie trees
  if [[ ${#ZOMBIE_ROOTS[@]} -eq 0 ]]; then
    echo -e "${GREEN}Clean! No zombies found.${RESET}"
    return
  fi

  local tree_idx=0
  for root in "${ZOMBIE_ROOTS[@]}"; do
    ((tree_idx++))
    local label
    label=$(proc_label "$root")
    echo -e "${RED}[Zombie $tree_idx] ${label}${RESET}"
    echo "─────────────────────────────────"
    print_tree "$root"

    local tree_count
    tree_count=$(( 1 + $(collect_tree "$root" | wc -l | tr -d ' ') ))
    echo -e "  ${DIM}($tree_count processes in tree)${RESET}"
    echo ""
  done

  # Summary
  echo "─────────────────────────────────"
  echo -e "Total: ${RED}${#ZOMBIE_ROOTS[@]}${RESET} zombie tree(s), ${RED}${#ZOMBIE_ALL_PIDS[@]}${RESET} process(es)"
  echo -e "${DIM}Use './scripts/zombies.sh clear' to kill them${RESET}"
}

cmd_show() {
  local target_pid=$1

  if ! ps -p "$target_pid" > /dev/null 2>&1; then
    echo -e "${RED}PID $target_pid does not exist.${RESET}"
    exit 1
  fi

  echo -e "${BOLD}=== Process Detail: PID $target_pid ===${RESET}"
  echo ""

  # Basic info
  echo -e "${CYAN}[Basic]${RESET}"
  ps -o pid,ppid,user,%cpu,%mem,stat,start,time -p "$target_pid" 2>/dev/null
  echo ""

  # Full command line
  echo -e "${CYAN}[Command]${RESET}"
  ps -o args= -p "$target_pid" 2>/dev/null || echo "  (unavailable)"
  echo ""

  # Session ID
  local session_id
  session_id=$(ps -o args= -p "$target_pid" 2>/dev/null | grep -oE 'session-id [^ ]+' | cut -d' ' -f2 || echo "")
  if [[ -n "$session_id" ]]; then
    echo -e "${CYAN}[Session]${RESET}"
    echo "  $session_id"
    echo ""
  fi

  # Open ports
  echo -e "${CYAN}[Open Ports]${RESET}"
  local ports
  ports=$(lsof -iTCP -sTCP:LISTEN -P -n -a -p "$target_pid" 2>/dev/null | awk 'NR>1{print "  " $9}' || true)
  if [[ -n "$ports" ]]; then
    echo "$ports"
  else
    echo -e "  ${DIM}(none)${RESET}"
  fi
  echo ""

  # Open files count
  echo -e "${CYAN}[Open Files]${RESET}"
  local fd_count
  fd_count=$(lsof -p "$target_pid" 2>/dev/null | wc -l | tr -d ' ' || echo "0")
  echo "  $fd_count file descriptors"
  echo ""

  # Full process tree
  echo -e "${CYAN}[Process Tree]${RESET}"
  local children
  children=$(children_of "$target_pid")
  if [[ -n "$children" ]]; then
    print_tree "$target_pid"
  else
    echo -e "  ${DIM}(no children)${RESET}"
  fi
  echo ""

  # Protection status
  if is_alive_root "$target_pid"; then
    echo -e "${GREEN}[Status] ALIVE — protected from clear${RESET}"
  else
    echo -e "${RED}[Status] ZOMBIE CANDIDATE — can be cleared${RESET}"
  fi
}

cmd_clear() {
  local target_pid=""
  local skip_confirm=false

  for arg in "$@"; do
    case "$arg" in
      -y) skip_confirm=true ;;
      *)  target_pid="$arg" ;;
    esac
  done

  # Clear specific PID (kills entire tree rooted at that PID)
  if [[ -n "$target_pid" ]]; then
    if is_protected "$target_pid"; then
      echo -e "${RED}PID $target_pid belongs to the active session. Cannot kill.${RESET}"
      exit 1
    fi
    if ! ps -p "$target_pid" > /dev/null 2>&1; then
      echo -e "${YELLOW}PID $target_pid already gone.${RESET}"
      exit 0
    fi

    # Kill tree bottom-up (children first, then parent)
    local tree_pids
    tree_pids=$(collect_tree "$target_pid")
    local killed=0
    # Reverse order: kill deepest children first
    if [[ -n "$tree_pids" ]]; then
      local reversed
      reversed=$(echo "$tree_pids" | tail -r 2>/dev/null || echo "$tree_pids" | tac 2>/dev/null || echo "$tree_pids")
      while IFS= read -r child; do
        child=$(echo "$child" | tr -d ' ')
        [[ -z "$child" ]] && continue
        if kill "$child" 2>/dev/null; then
          echo -e "  ${GREEN}killed${RESET} PID $child"
          ((killed++))
        fi
      done <<< "$reversed"
    fi
    if kill "$target_pid" 2>/dev/null; then
      echo -e "  ${GREEN}killed${RESET} PID $target_pid (root)"
      ((killed++))
    fi
    echo -e "${GREEN}Done.${RESET} Killed $killed process(es)."
    return
  fi

  # Clear all zombie trees
  discover_roots
  classify_roots

  if [[ ${#ZOMBIE_ALL_PIDS[@]} -eq 0 ]]; then
    echo -e "${GREEN}Clean! No zombies to clear.${RESET}"
    return
  fi

  echo -e "Found ${RED}${#ZOMBIE_ROOTS[@]}${RESET} zombie tree(s), ${RED}${#ZOMBIE_ALL_PIDS[@]}${RESET} process(es)"

  if [[ "$skip_confirm" != true ]]; then
    read -r -p "Kill all? [y/N] " answer
    if [[ ! "$answer" =~ ^[Yy]$ ]]; then
      echo "Aborted."
      return
    fi
  fi

  # Kill trees bottom-up: process deepest children first
  local killed=0
  for root in "${ZOMBIE_ROOTS[@]}"; do
    local tree_pids
    tree_pids=$(collect_tree "$root")
    if [[ -n "$tree_pids" ]]; then
      local reversed
      reversed=$(echo "$tree_pids" | tail -r 2>/dev/null || echo "$tree_pids" | tac 2>/dev/null || echo "$tree_pids")
      while IFS= read -r child; do
        child=$(echo "$child" | tr -d ' ')
        [[ -z "$child" ]] && continue
        if kill "$child" 2>/dev/null; then
          ((killed++))
        fi
      done <<< "$reversed"
    fi
    if kill "$root" 2>/dev/null; then
      ((killed++))
    fi
  done
  echo -e "${GREEN}Done.${RESET} Killed $killed/${#ZOMBIE_ALL_PIDS[@]} processes."
}

# ── Main ──
COMMAND="${1:-list}"
shift || true

case "$COMMAND" in
  list)
    cmd_list
    ;;
  show)
    if [[ $# -eq 0 ]]; then
      echo "Usage: $0 show <PID>"
      exit 1
    fi
    cmd_show "$1"
    ;;
  clear)
    cmd_clear "$@"
    ;;
  *)
    echo "Usage: $0 [list|show <PID>|clear [-y|<PID>]]"
    exit 1
    ;;
esac

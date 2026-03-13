#!/usr/bin/env bash
# tunnel2.sh - cloudflared를 이용해 로컬 백엔드를 외부에 노출
# 사용법: ./scripts/tunnel2.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_PORT=19836
FRONTEND_PORT=5173
MAX_RETRIES=10
RETRY_INTERVAL=1
DEV_MODE=false

# ── 옵션 파싱 ────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev) DEV_MODE=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# ── 색상 ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()  { echo -e "${CYAN}[tunnel]${RESET} $*"; }
ok()    { echo -e "${GREEN}[tunnel]${RESET} $*"; }
warn()  { echo -e "${YELLOW}[tunnel]${RESET} $*"; }
fail()  { echo -e "${RED}[tunnel]${RESET} $*"; exit 1; }

# ── 종료 시 정리할 PID 추적 ──────────────────────────
BACKEND_PID=""
CLOUDFLARED_PID=""
STARTED_BACKEND=false
LOG_FILE="/tmp/cloudflared-tunnel.log"

cleanup() {
  if [ -n "$CLOUDFLARED_PID" ] && kill -0 "$CLOUDFLARED_PID" 2>/dev/null; then
    info "cloudflared 종료 중 (PID: ${CLOUDFLARED_PID})..."
    kill "$CLOUDFLARED_PID" 2>/dev/null || true
  fi
  if [ "$STARTED_BACKEND" = true ] && [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    info "백엔드 종료 중 (PID: ${BACKEND_PID})..."
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# ── 1. cloudflared 설치 확인 (없으면 자동 설치) ──────
CLOUDFLARED_BIN=""

if command -v cloudflared &>/dev/null; then
  CLOUDFLARED_BIN="cloudflared"
else
  LOCAL_BIN="$ROOT/.local/bin/cloudflared"
  if [ -x "$LOCAL_BIN" ]; then
    CLOUDFLARED_BIN="$LOCAL_BIN"
  else
    info "cloudflared가 설치되어 있지 않습니다. 자동 설치를 시작합니다..."

    if command -v brew &>/dev/null; then
      # brew 있으면 brew로 설치
      info "Homebrew로 cloudflared를 설치합니다..."
      brew install cloudflared
      CLOUDFLARED_BIN="cloudflared"
    else
      # brew 없으면 바이너리 직접 다운로드
      OS="$(uname -s)"
      ARCH="$(uname -m)"
      DOWNLOAD_URL=""

      case "$OS" in
        Darwin)
          case "$ARCH" in
            arm64) DOWNLOAD_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz" ;;
            x86_64) DOWNLOAD_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz" ;;
          esac
          ;;
        Linux)
          case "$ARCH" in
            x86_64) DOWNLOAD_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" ;;
            aarch64|arm64) DOWNLOAD_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64" ;;
          esac
          ;;
      esac

      if [ -z "$DOWNLOAD_URL" ]; then
        fail "지원하지 않는 OS/아키텍처입니다: ${OS}/${ARCH}
  수동 설치: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
      fi

      mkdir -p "$ROOT/.local/bin"

      if [[ "$DOWNLOAD_URL" == *.tgz ]]; then
        info "다운로드 중: ${DOWNLOAD_URL}"
        curl -fsSL "$DOWNLOAD_URL" | tar -xz -C "$ROOT/.local/bin"
      else
        info "다운로드 중: ${DOWNLOAD_URL}"
        curl -fsSL -o "$LOCAL_BIN" "$DOWNLOAD_URL"
      fi

      chmod +x "$LOCAL_BIN"
      CLOUDFLARED_BIN="$LOCAL_BIN"
    fi

    ok "cloudflared 설치 완료"
  fi
fi

# ── 2. 포트 점유 확인 & 백엔드 시작 ──────────────────
is_port_listening() {
  lsof -iTCP:"$1" -sTCP:LISTEN -t &>/dev/null
}

if [ "$DEV_MODE" = true ]; then
  # --dev: 백엔드 + 프론트 모두 이미 떠있어야 함
  TUNNEL_PORT=$FRONTEND_PORT
  MISSING=()
  if ! is_port_listening "$BACKEND_PORT"; then
    MISSING+=("백엔드 (포트 ${BACKEND_PORT}) — ./scripts/build.sh be-dev")
  fi
  if ! is_port_listening "$FRONTEND_PORT"; then
    MISSING+=("프론트엔드 (포트 ${FRONTEND_PORT}) — ./scripts/build.sh wv-dev")
  fi
  if [ ${#MISSING[@]} -gt 0 ]; then
    fail "다음 프로세스가 실행 중이지 않습니다:
$(printf '    • %s\n' "${MISSING[@]}")
  먼저 위 명령으로 프로세스를 시작한 후 다시 실행해주세요."
  fi
  ok "백엔드 (${BACKEND_PORT}) + 프론트엔드 (${FRONTEND_PORT}) 실행 확인 완료"
else
  # 기본 모드: 백엔드만 필요, 없으면 직접 시작
  TUNNEL_PORT=$BACKEND_PORT
  if is_port_listening "$BACKEND_PORT"; then
    ok "포트 ${BACKEND_PORT}에서 프로세스가 이미 실행 중입니다."
  else
    warn "포트 ${BACKEND_PORT}에 프로세스가 없습니다. 백엔드를 시작합니다..."

    # 백엔드 빌드 산출물 확인 → 없으면 빌드
    BACKEND_ENTRY="$ROOT/backend/dist/backend.mjs"
    if [ ! -f "$BACKEND_ENTRY" ]; then
      info "백엔드 빌드 산출물이 없습니다. 빌드를 먼저 실행합니다..."
      "$ROOT/scripts/build.sh" be-build
    fi

    # 백엔드 프로세스 시작 (백그라운드)
    node "$BACKEND_ENTRY" &
    BACKEND_PID=$!
    STARTED_BACKEND=true
    info "백엔드 프로세스 시작됨 (PID: ${BACKEND_PID})"

    # ── 3. 프로세스 대기 (1초 간격, 최대 10회) ─────────
    info "포트 ${BACKEND_PORT} 대기 중..."
    for i in $(seq 1 "$MAX_RETRIES"); do
      if is_port_listening "$BACKEND_PORT"; then
        ok "포트 ${BACKEND_PORT} 준비 완료! (${i}/${MAX_RETRIES})"
        break
      fi
      if [ "$i" -eq "$MAX_RETRIES" ]; then
        fail "포트 ${BACKEND_PORT}이 ${MAX_RETRIES}초 내에 열리지 않았습니다. 백엔드 로그를 확인해주세요."
      fi
      printf "  대기 중... (%d/%d)\r" "$i" "$MAX_RETRIES"
      sleep "$RETRY_INTERVAL"
    done
  fi
fi

# ── 4. cloudflared 실행 ──────────────────────────────
info "cloudflared 터널을 시작합니다..."

"$CLOUDFLARED_BIN" tunnel --protocol http2 --url "http://localhost:${TUNNEL_PORT}" > "$LOG_FILE" 2>&1 &
CLOUDFLARED_PID=$!

# stderr 로그에서 URL 추출 (최대 15초 대기)
info "cloudflared 터널 URL 확인 중..."
TUNNEL_URL=""
for i in $(seq 1 30); do
  TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$LOG_FILE" 2>/dev/null | head -1) || true

  if [ -n "$TUNNEL_URL" ]; then
    break
  fi
  sleep 0.5
done

if [ -z "$TUNNEL_URL" ]; then
  fail "cloudflared 터널 URL을 가져올 수 없습니다. 로그를 확인해주세요: $LOG_FILE"
fi

# ── 5. URL + QR 코드 출력 ────────────────────────────
echo ""
echo -e "${BOLD}============================================${RESET}"
echo -e "${GREEN}  Tunnel is ready!${RESET}"
echo -e "${BOLD}============================================${RESET}"
echo ""
echo -e "  ${CYAN}URL:${RESET} ${BOLD}${TUNNEL_URL}${RESET}"
echo -e "  ${CYAN}Local:${RESET} http://localhost:${TUNNEL_PORT}"
echo ""

# QR 코드 출력 (qrencode 우선, 없으면 npx qrcode)
if command -v qrencode &>/dev/null; then
  echo -e "${CYAN}  QR Code:${RESET}"
  echo ""
  qrencode -t ANSIUTF8 "$TUNNEL_URL"
elif command -v npx &>/dev/null; then
  echo -e "${CYAN}  QR Code:${RESET}"
  echo ""
  echo "$TUNNEL_URL" | npx --yes qrcode --small
else
  warn "QR 코드 출력 불가 (qrencode 또는 npx가 필요합니다)"
fi

echo ""
echo -e "${YELLOW}  Ctrl+C로 터널을 종료합니다.${RESET}"
echo ""

# cloudflared가 종료될 때까지 대기 (포그라운드 유지)
wait "$CLOUDFLARED_PID" 2>/dev/null || true

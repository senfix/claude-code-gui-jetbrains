#!/usr/bin/env bash
# clear-cache.sh - 모든 빌드 캐시/결과물을 삭제
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== Clearing build caches ==="

dirs=(
  "$ROOT/.gradle"
  "$ROOT/build"
  "$ROOT/.kotlin"
  "$ROOT/out"
  "$ROOT/.vite"
  "$ROOT/webview/dist"
  "$ROOT/backend/dist"
  "$ROOT/src/main/resources/webview"
  "$ROOT/src/main/resources/backend"
)

for d in "${dirs[@]}"; do
  if [ -d "$d" ]; then
    echo "  rm: $d"
    rm -rf "$d"
  fi
done

# TypeScript build info
find "$ROOT" -name '*.tsbuildinfo' -not -path '*/node_modules/*' -delete 2>/dev/null && \
  echo "  rm: *.tsbuildinfo" || true

echo "=== Done ==="

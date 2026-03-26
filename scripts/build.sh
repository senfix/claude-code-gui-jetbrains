#!/usr/bin/env bash
# build.sh - 통합 빌드 스크립트
# 사용법: bash ./scripts/build.sh <command>
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

usage() {
  cat <<'HELP'
Usage: bash ./scripts/build.sh <command>

Backend (backend/):
  be-install     pnpm install
  be-build       pnpm build
  be-lint        pnpm lint
  be-dev         pnpm dev
  be-test        pnpm test
  be-test-cov    pnpm test:coverage (coverage report)

WebView (webview/):
  wv-install     pnpm install
  wv-build       pnpm build
  wv-lint        pnpm lint
  wv-tsc         tsc
  wv-dev         pnpm dev
  wv-test        pnpm test
  wv-test-watch  pnpm test:watch
  wv-test-cov    pnpm test:coverage (coverage report)
  wv-test-ui     pnpm test:ui (browser dashboard)

Plugin (Gradle):
  build          gradlew build
  run-ide        gradlew runIde (CLAUDE_DEV_MODE=true)
  build-plugin   gradlew buildPlugin
  clean          gradlew clean
  test           gradlew test
  test-cov       gradlew koverHtmlReport (Kotlin coverage)

Combined:
  full-build     be-build + wv-build + gradlew build
  dist           be-build + wv-build + gradlew buildPlugin
  all            be-build + wv-build + gradlew build + runIde
  clear-cache    빌드 캐시/결과물 삭제
HELP
}

case "${1:-}" in
  # --- Backend ---
  be-install)     pnpm -C "$ROOT/backend" install ;;
  be-build)       pnpm -C "$ROOT/backend" build ;;
  be-lint)        pnpm -C "$ROOT/backend" lint ;;
  be-dev)         pnpm -C "$ROOT/backend" dev ;;
  be-test)        pnpm -C "$ROOT/backend" test ;;
  be-test-cov)    pnpm -C "$ROOT/backend" test:coverage ;;

  # --- WebView ---
  wv-install)     pnpm -C "$ROOT/webview" install ;;
  wv-build)       pnpm -C "$ROOT/webview" build ;;
  wv-lint)        pnpm -C "$ROOT/webview" lint ;;
  wv-tsc)         pnpm -C "$ROOT/webview" exec node ./node_modules/typescript/lib/tsc.js ;;
  wv-dev)         pnpm -C "$ROOT/webview" dev ;;
  wv-test)        pnpm -C "$ROOT/webview" test ;;
  wv-test-watch)  pnpm -C "$ROOT/webview" test:watch ;;
  wv-test-cov)    pnpm -C "$ROOT/webview" test:coverage ;;
  wv-test-ui)     pnpm -C "$ROOT/webview" test:ui ;;

  # --- Plugin (Gradle) ---
  build)          "$ROOT/gradlew" -p "$ROOT" build ;;
  run-ide)        CLAUDE_DEV_MODE=true "$ROOT/gradlew" -p "$ROOT" runIde ;;
  build-plugin)   "$ROOT/gradlew" -p "$ROOT" buildPlugin ;;
  clean)          "$ROOT/gradlew" -p "$ROOT" clean ;;
  test)           "$ROOT/gradlew" -p "$ROOT" test ;;
  test-cov)       "$ROOT/gradlew" -p "$ROOT" koverHtmlReport ;;

  # --- Combined ---
  full-build)
    echo "=== Backend build ==="
    pnpm -C "$ROOT/backend" build
    echo "=== WebView build ==="
    pnpm -C "$ROOT/webview" build
    echo "=== Plugin build ==="
    "$ROOT/gradlew" -p "$ROOT" build
    ;;
  dist)
    echo "=== Backend build ==="
    pnpm -C "$ROOT/backend" build
    echo "=== WebView build ==="
    pnpm -C "$ROOT/webview" build
    echo "=== Plugin buildPlugin ==="
    "$ROOT/gradlew" -p "$ROOT" buildPlugin
    ;;
  all)
    echo "=== Backend build ==="
    pnpm -C "$ROOT/backend" build
    echo "=== WebView build ==="
    pnpm -C "$ROOT/webview" build
    echo "=== Plugin build ==="
    "$ROOT/gradlew" -p "$ROOT" build
    echo "=== RunIde ==="
    CLAUDE_DEV_MODE=true "$ROOT/gradlew" -p "$ROOT" runIde
    ;;
  clear-cache)
    "$ROOT/clear-cache.sh"
    ;;

  # --- Help ---
  -h|--help|"")
    usage
    ;;
  *)
    echo "Unknown command: $1" >&2
    usage >&2
    exit 1
    ;;
esac

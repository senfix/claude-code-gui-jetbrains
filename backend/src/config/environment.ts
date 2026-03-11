import { existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// ── 빌드 환경 ──────────────────────────────────────────
export const isDev = () => process.env.NODE_ENV !== 'production';
export const isProd = () => process.env.NODE_ENV === 'production';

// ── 실행 환경 ──────────────────────────────────────────
export const isJetBrainsMode = process.env.JETBRAINS_MODE === 'true';

// ── 서버 설정 ──────────────────────────────────────────
const DEFAULT_PORT = 19836;
export const serverPort = parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);

function resolveWebviewDir(): string | undefined {
  if (process.env.WEBVIEW_DIR) return process.env.WEBVIEW_DIR;
  if (isJetBrainsMode) return undefined;

  // Browser 모드: backend/dist/backend.mjs 기준 ../../webview/dist
  const currentFile = fileURLToPath(import.meta.url);
  // backend/dist/backend.mjs → ../../webview/dist (루트 기준)
  const candidate = resolve(currentFile, '..', '..', '..', 'webview', 'dist');
  return existsSync(resolve(candidate, 'index.html')) ? candidate : undefined;
}

export const webviewDir = resolveWebviewDir();

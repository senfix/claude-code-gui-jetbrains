/**
 * ANSI escape code 기반 콘솔 색상 유틸리티
 *
 * Node.js (Vite 플러그인) 환경에서 실행되므로 ANSI 코드가 정상 동작함.
 * chalk 같은 외부 의존성 없이 직접 구현.
 */

// ─── 텍스트 색상 ─────────────────────────────────────────────────────────────

export const red     = (text: string) => `\x1b[31m${text}\x1b[0m`;
export const green   = (text: string) => `\x1b[32m${text}\x1b[0m`;
export const yellow  = (text: string) => `\x1b[33m${text}\x1b[0m`;
export const blue    = (text: string) => `\x1b[34m${text}\x1b[0m`;
export const magenta = (text: string) => `\x1b[35m${text}\x1b[0m`;
export const cyan    = (text: string) => `\x1b[36m${text}\x1b[0m`;
export const white   = (text: string) => `\x1b[37m${text}\x1b[0m`;
export const gray    = (text: string) => `\x1b[90m${text}\x1b[0m`;

// ─── 굵기 ─────────────────────────────────────────────────────────────────────

export const bold = (text: string) => `\x1b[1m${text}\x1b[0m`;

// ─── 배경색 ───────────────────────────────────────────────────────────────────

export const bgRed     = (text: string) => `\x1b[41m${text}\x1b[0m`;
export const bgGreen   = (text: string) => `\x1b[42m${text}\x1b[0m`;
export const bgYellow  = (text: string) => `\x1b[43m${text}\x1b[0m`;
export const bgBlue    = (text: string) => `\x1b[44m${text}\x1b[0m`;
export const bgMagenta = (text: string) => `\x1b[45m${text}\x1b[0m`;
export const bgCyan    = (text: string) => `\x1b[46m${text}\x1b[0m`;
export const bgWhite   = (text: string) => `\x1b[47m${text}\x1b[0m`;

// ─── 리셋 ─────────────────────────────────────────────────────────────────────

export const reset = (text: string) => `\x1b[0m${text}`;

// ─── [dev-bridge] 프리픽스 로거 ───────────────────────────────────────────────

export const log   = (...args: unknown[]) => console.log('[dev-bridge]', ...args);
export const warn  = (...args: unknown[]) => console.warn('[dev-bridge]', ...args);
export const error = (...args: unknown[]) => console.error('[dev-bridge]', ...args);

export const label = (text: string) => gray(text);

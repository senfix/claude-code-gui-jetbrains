/**
 * Development Bridge for Claude Code CLI
 *
 * Vite dev server에서 WebSocket을 통해 Claude CLI와 통신
 */
export {
  IPCMessage,
  generateSessionId,
  sendToClient,
  broadcastToSession,
  subscribeToSession,
  unsubscribeFromSession,
  startClaudeProcess,
} from './features';

import { configureServer } from './boot';

export function devBridgePlugin() {
  return { name: 'dev-bridge', configureServer };
}

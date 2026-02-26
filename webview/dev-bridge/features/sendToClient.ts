import type { WebSocket } from 'ws';
import type { IPCMessage } from './types';

export function sendToClient(ws: WebSocket, type: string, payload: Record<string, unknown> = {}) {
  const message: IPCMessage = {
    type,
    payload,
    timestamp: Date.now(),
  };
  ws.send(JSON.stringify(message));
}

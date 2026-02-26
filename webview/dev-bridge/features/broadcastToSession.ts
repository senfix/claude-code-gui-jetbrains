import type { WebSocket } from 'ws';
import type { IPCMessage } from './types';
import { sessionRegistry } from '../registries';

/**
 * 특정 세션의 모든 구독자에게 메시지 브로드캐스트.
 * 전송 실패한 ws는 조용히 무시 (disconnect 이벤트에서 정리됨).
 */
export function broadcastToSession(sessionId: string, type: string, payload: Record<string, unknown> = {}, excludeWs?: WebSocket) {
  const session = sessionRegistry.get(sessionId);
  if (!session) return;

  const message: IPCMessage = {
    type,
    payload,
    timestamp: Date.now(),
  };
  const data = JSON.stringify(message);

  for (const ws of session.subscribers) {
    if (ws === excludeWs) continue;
    try {
      if (ws.readyState === 1 /* WebSocket.OPEN */) {
        ws.send(data);
      }
    } catch {
      // 전송 실패 — disconnect 핸들러에서 정리
    }
  }
}

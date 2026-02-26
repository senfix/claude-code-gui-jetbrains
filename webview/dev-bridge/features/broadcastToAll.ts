import type { IPCMessage } from './types';
import { clientRegistry } from '../registries';

/**
 * 연결된 모든 WebSocket 클라이언트에게 메시지 브로드캐스트.
 * 세션과 무관하게 모든 탭에 전달되어야 하는 이벤트에 사용.
 */
export function broadcastToAll(type: string, payload: Record<string, unknown> = {}) {
  const message: IPCMessage = {
    type,
    payload,
    timestamp: Date.now(),
  };
  const data = JSON.stringify(message);

  for (const ws of clientRegistry.keys()) {
    try {
      if (ws.readyState === 1 /* WebSocket.OPEN */) {
        ws.send(data);
      }
    } catch {
      // 전송 실패 — disconnect 핸들러에서 정리
    }
  }
}

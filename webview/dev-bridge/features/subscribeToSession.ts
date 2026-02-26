import type { WebSocket } from 'ws';
import { sessionRegistry, clientRegistry } from '../registries';
import { log } from '../log';

/**
 * ws를 sessionId에 구독. 기존 구독이 있으면 자동 해제 후 새 구독.
 * SessionRecord가 없으면 생성 (프로세스 없는 빈 레코드).
 */
export function subscribeToSession(ws: WebSocket, sessionId: string) {
  // 기존 구독 해제
  unsubscribeFromSession(ws);

  // SessionRecord 없으면 생성
  if (!sessionRegistry.has(sessionId)) {
    sessionRegistry.set(sessionId, {
      sessionId,
      process: null,
      subscribers: new Set(),
      buffer: '',
      workingDir: process.cwd(),
    });
  }

  const session = sessionRegistry.get(sessionId)!;
  session.subscribers.add(ws);

  // ClientRecord 갱신
  const client = clientRegistry.get(ws);
  if (client) {
    client.subscribedSessionId = sessionId;
  }

  log(`WS subscribed to session ${sessionId} (subscribers: ${session.subscribers.size})`);
}

/**
 * ws의 현재 구독 해제. 구독자가 0이 되면 cleanupSession 호출.
 */
export function unsubscribeFromSession(ws: WebSocket) {
  const client = clientRegistry.get(ws);
  if (!client?.subscribedSessionId) return;

  const sessionId = client.subscribedSessionId;
  const session = sessionRegistry.get(sessionId);

  if (session) {
    session.subscribers.delete(ws);
    log(`WS unsubscribed from session ${sessionId} (subscribers: ${session.subscribers.size})`);

    if (session.subscribers.size === 0) {
      cleanupSession(sessionId);
    }
  }

  client.subscribedSessionId = null;
}

/**
 * 세션 프로세스 종료 + 레지스트리에서 제거.
 */
function cleanupSession(sessionId: string) {
  const session = sessionRegistry.get(sessionId);
  if (!session) return;

  if (session.process) {
    log(`Killing process for session ${sessionId} (PID: ${session.process.pid})`);
    session.process.kill('SIGTERM');
    session.process = null;
  }

  sessionRegistry.delete(sessionId);
  log(`Session ${sessionId} cleaned up`);
}

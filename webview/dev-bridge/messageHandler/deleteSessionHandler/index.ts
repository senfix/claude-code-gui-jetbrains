import type { WebSocket } from 'ws';
import type { IPCMessage } from '../../index';
import { sendToClient } from '../../index';
import { broadcastToAll } from '../../features/broadcastToAll';
import { getProjectSessionsPath } from '../../features/getProjectSessionsPath';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function deleteSessionHandler(ws: WebSocket, message: IPCMessage) {
  const sessionId = message.payload?.sessionId as string | undefined;

  if (!sessionId) {
    sendToClient(ws, 'ACK', { requestId: message.requestId, status: 'error', error: 'Missing sessionId' });
    return;
  }

  try {
    // 세션 JSONL 파일 삭제
    const sessionsDir = await getProjectSessionsPath(message.payload?.workingDir as string || process.cwd());
    const sessionFile = path.join(sessionsDir, `${sessionId}.jsonl`);
    await fs.unlink(sessionFile);

    // 모든 탭에 알림
    broadcastToAll('SESSIONS_UPDATED', {
      action: 'delete',
      session: { sessionId },
    });

    sendToClient(ws, 'ACK', { requestId: message.requestId, status: 'ok' });
  } catch (err: any) {
    sendToClient(ws, 'ACK', { requestId: message.requestId, status: 'error', error: err.message });
  }
}

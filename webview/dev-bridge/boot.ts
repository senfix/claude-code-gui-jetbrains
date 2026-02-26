/**
 * WebSocket server bootstrap for the dev bridge.
 *
 * Extracted from devBridgePlugin's configureServer callback so the
 * heavy routing logic lives in its own module.
 */
import { createRequire } from 'module';
import type { ViteDevServer } from 'vite';
import type { WebSocket, WebSocketServer } from 'ws';
import { sendToClient, unsubscribeFromSession } from './index';
import { log } from './log';
import { clientRegistry } from './registries';
import { handleMessage } from './messageHandler';

const require = createRequire(import.meta.url);

export function configureServer(server: ViteDevServer) {
  // WebSocket 서버 생성
  const { WebSocketServer } = require('ws') as { WebSocketServer: new (options: { noServer: true }) => WebSocketServer };
  const wss = new WebSocketServer({ noServer: true });

  // HTTP 서버의 upgrade 이벤트 처리
  server.httpServer?.on('upgrade', (request, socket, head) => {
    if (request.url === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  // WebSocket 연결 처리
  wss.on('connection', (ws: WebSocket) => {
    log('Client connected');

    // 클라이언트 레지스트리에 등록
    clientRegistry.set(ws, { subscribedSessionId: null });

    // 연결 확인 메시지 전송
    sendToClient(ws, 'BRIDGE_READY');

    ws.on('message', (data: Buffer) => handleMessage(ws, data));

    ws.on('close', () => {
      log('Client disconnected');
      unsubscribeFromSession(ws);
      clientRegistry.delete(ws);
    });
  });

  log('WebSocket server initialized at /ws');
}

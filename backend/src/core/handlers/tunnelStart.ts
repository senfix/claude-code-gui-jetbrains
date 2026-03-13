import type { ConnectionManager } from '../../ws/connection-manager';
import type { Bridge } from '../../bridge/bridge-interface';
import type { IPCMessage } from '../types';
import { startTunnel } from '../features/tunnel-manager';
import { serverPort } from '../../config/environment';

export async function tunnelStartHandler(
  connectionId: string,
  message: IPCMessage,
  connections: ConnectionManager,
  _bridge: Bridge,
): Promise<void> {
  const port = typeof message.payload?.port === 'number' ? message.payload.port : serverPort;
  try {
    const tunnelUrl = await startTunnel(port);
    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: 'ok',
      url: tunnelUrl,
    });
    connections.broadcastToAll('TUNNEL_STATUS', { enabled: true, url: tunnelUrl });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: 'error',
      error,
    });
  }
}

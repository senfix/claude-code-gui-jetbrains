import type { ConnectionManager } from '../../ws/connection-manager';
import type { Bridge } from '../../bridge/bridge-interface';
import type { IPCMessage } from '../types';
import { stopTunnel } from '../features/tunnel-manager';

export async function tunnelStopHandler(
  connectionId: string,
  message: IPCMessage,
  connections: ConnectionManager,
  _bridge: Bridge,
): Promise<void> {
  try {
    await stopTunnel();
    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: 'ok',
    });
    connections.broadcastToAll('TUNNEL_STATUS', { enabled: false, url: null });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: 'error',
      error,
    });
  }
}

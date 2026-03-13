import type { ConnectionManager } from '../../ws/connection-manager';
import type { Bridge } from '../../bridge/bridge-interface';
import type { IPCMessage } from '../types';
import { enableSleepGuard } from '../features/sleep-guard';

export async function sleepGuardEnableHandler(
  connectionId: string,
  message: IPCMessage,
  connections: ConnectionManager,
  _bridge: Bridge,
): Promise<void> {
  try {
    await enableSleepGuard();
    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: 'ok',
    });
    connections.broadcastToAll('SLEEP_GUARD_STATUS', { enabled: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: 'error',
      error,
    });
  }
}

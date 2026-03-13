import type { ConnectionManager } from '../../ws/connection-manager';
import type { Bridge } from '../../bridge/bridge-interface';
import type { IPCMessage } from '../types';
import { getTunnelStatus } from '../features/tunnel-manager';
import { getSleepGuardStatus } from '../features/sleep-guard';

export async function getTunnelStatusHandler(
  connectionId: string,
  message: IPCMessage,
  connections: ConnectionManager,
  _bridge: Bridge,
): Promise<void> {
  try {
    const tunnel = getTunnelStatus();
    const sleepGuard = getSleepGuardStatus();
    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: 'ok',
      tunnel,
      sleepGuard,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: 'error',
      error,
    });
  }
}

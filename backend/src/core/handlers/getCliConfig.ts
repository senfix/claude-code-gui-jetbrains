import type { ConnectionManager } from '../../ws/connection-manager';
import type { Bridge } from '../../bridge/bridge-interface';
import type { IPCMessage } from '../types';
import { loadCliConfig } from '../features/loadCliConfig';

export async function getCliConfigHandler(
  connectionId: string,
  message: IPCMessage,
  connections: ConnectionManager,
  _bridge: Bridge,
): Promise<void> {
  try {
    const workingDir = (message.payload as Record<string, unknown>)?.workingDir as string | undefined;
    const cwd = workingDir || process.cwd();

    console.error('[node-backend]', `Loading CLI config for cwd: ${cwd}`);
    const controlResponse = await loadCliConfig(cwd);

    if (controlResponse) {
      console.error('[node-backend]', 'CLI config loaded');
    } else {
      console.error('[node-backend]', 'CLI config: null (CLI may not be available)');
    }

    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: 'ok',
      controlResponse,
    });
  } catch (err) {
    console.error('[node-backend]', 'Failed to load CLI config:', err);
    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

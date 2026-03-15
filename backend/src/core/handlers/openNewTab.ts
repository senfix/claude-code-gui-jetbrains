import type { ConnectionManager } from '../../ws/connection-manager';
import type { Bridge } from '../../bridge/bridge-interface';
import type { IPCMessage } from '../types';

export async function openNewTabHandler(
  connectionId: string,
  message: IPCMessage,
  connections: ConnectionManager,
  bridge: Bridge,
): Promise<void> {
  try {
    const workingDir = message.payload?.workingDir as string | undefined;
    await bridge.newSession(workingDir);
  } catch (err) {
    console.error('[node-backend]', 'bridge.newSession() for OPEN_NEW_TAB failed:', err);
  }

  connections.sendTo(connectionId, 'ACK', { requestId: message.requestId });
}

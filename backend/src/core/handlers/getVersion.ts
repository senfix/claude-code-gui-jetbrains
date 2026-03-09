import { exec } from 'child_process';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { ConnectionManager } from '../../ws/connection-manager';
import type { Bridge } from '../../bridge/bridge-interface';
import type { IPCMessage } from '../types';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function getPluginVersion(): Promise<string> {
  const pkgPath = join(__dirname, '../../../package.json');
  const raw = await readFile(pkgPath, 'utf-8');
  const pkg = JSON.parse(raw) as { version: string };
  return pkg.version;
}

function getCliVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    exec('claude --version', { timeout: 5000 }, (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      const raw = stdout.trim();
      const match = raw.match(/^[\d.]+/);
      resolve(match ? match[0] : raw);
    });
  });
}

export async function getVersionHandler(
  connectionId: string,
  message: IPCMessage,
  connections: ConnectionManager,
  bridge: Bridge,
): Promise<void> {
  try {
    const [pluginVersion, cliVersion, requiresRestart] = await Promise.all([
      getPluginVersion().catch(() => 'unknown'),
      getCliVersion(),
      bridge.requiresRestart().catch(() => true),
    ]);

    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: 'ok',
      pluginVersion,
      cliVersion,
      requiresRestart,
    });
  } catch (err) {
    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

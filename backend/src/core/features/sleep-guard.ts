import { exec, spawn, type ChildProcess } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SleepGuardStatus {
  enabled: boolean;
  platform: string;
}

let sleepGuardEnabled = false;
let inhibitProcess: ChildProcess | null = null;

export async function enableSleepGuard(): Promise<void> {
  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      if (inhibitProcess) {
        sleepGuardEnabled = true;
        return;
      }
      // caffeinate -s: prevent system sleep (including lid close)
      // caffeinate -i: prevent idle sleep
      const proc = spawn('caffeinate', ['-s', '-i'], {
        stdio: 'ignore',
        detached: true,
      });
      proc.unref();
      inhibitProcess = proc;

      proc.on('error', (err) => {
        console.error('[node-backend]', 'caffeinate error:', err);
        inhibitProcess = null;
        sleepGuardEnabled = false;
      });

      proc.on('exit', (code, signal) => {
        console.error('[node-backend]', `caffeinate exited code=${code} signal=${signal}`);
        inhibitProcess = null;
        sleepGuardEnabled = false;
      });
    } else if (platform === 'linux') {
      if (inhibitProcess) {
        // Already inhibiting
        sleepGuardEnabled = true;
        return;
      }
      const proc = spawn(
        'systemd-inhibit',
        [
          '--what=sleep',
          '--who=Claude Code GUI',
          '--why=Tunnel active',
          'sleep',
          'infinity',
        ],
        {
          stdio: 'ignore',
          detached: true,
        }
      );
      proc.unref();
      inhibitProcess = proc;

      proc.on('error', (err) => {
        console.error('[node-backend]', 'systemd-inhibit error:', err);
        inhibitProcess = null;
        sleepGuardEnabled = false;
      });

      proc.on('exit', (code, signal) => {
        console.error('[node-backend]', `systemd-inhibit exited code=${code} signal=${signal}`);
        inhibitProcess = null;
        sleepGuardEnabled = false;
      });
    } else if (platform === 'win32') {
      await execAsync('powercfg /change standby-timeout-ac 0');
      await execAsync('powercfg /change standby-timeout-dc 0');
    } else {
      console.error('[node-backend]', `enableSleepGuard: unsupported platform ${platform}`);
      return;
    }

    sleepGuardEnabled = true;
  } catch (err) {
    console.error('[node-backend]', 'Failed to enable sleep guard:', err);
    throw err;
  }
}

export async function disableSleepGuard(): Promise<void> {
  const platform = process.platform;

  try {
    if (platform === 'darwin') {
      if (inhibitProcess) {
        try {
          inhibitProcess.kill('SIGTERM');
        } catch (err) {
          console.error('[node-backend]', 'Failed to kill caffeinate process:', err);
        }
        inhibitProcess = null;
      }
    } else if (platform === 'linux') {
      if (inhibitProcess) {
        try {
          inhibitProcess.kill('SIGTERM');
        } catch (err) {
          console.error('[node-backend]', 'Failed to kill inhibit process:', err);
        }
        inhibitProcess = null;
      }
    } else if (platform === 'win32') {
      await execAsync('powercfg /change standby-timeout-ac 30');
      await execAsync('powercfg /change standby-timeout-dc 15');
    } else {
      console.error('[node-backend]', `disableSleepGuard: unsupported platform ${platform}`);
      return;
    }

    sleepGuardEnabled = false;
  } catch (err) {
    console.error('[node-backend]', 'Failed to disable sleep guard:', err);
    throw err;
  }
}

/**
 * Check actual system sleep guard state and sync in-memory variables.
 * Called on backend startup.
 */
export async function restoreSleepGuardState(): Promise<void> {
  const os = process.platform;
  try {
    // darwin & linux: process-based, doesn't survive backend restart
    if (os === 'win32') {
      const { stdout } = await execAsync('powercfg /query SCHEME_CURRENT SUB_SLEEP STANDBYIDLE');
      // If AC timeout is 0x00000000, sleep is disabled
      const acMatch = /Current AC Power Setting Index:\s*0x([0-9a-fA-F]+)/.exec(stdout);
      if (acMatch && parseInt(acMatch[1], 16) === 0) {
        sleepGuardEnabled = true;
        console.error('[node-backend]', 'Restored sleep guard state: enabled=true');
      }
    }
  } catch {
    // ignore — unable to determine system state
  }
}

export function getSleepGuardStatus(): SleepGuardStatus {
  return {
    enabled: sleepGuardEnabled,
    platform: process.platform,
  };
}

// Cleanup on process exit
process.on('exit', () => {
  if (sleepGuardEnabled) {
    disableSleepGuard().catch((err) => {
      console.error('[node-backend]', 'cleanup disableSleepGuard failed:', err);
    });
  }
});

process.on('SIGTERM', () => {
  if (sleepGuardEnabled) {
    disableSleepGuard().catch((err) => {
      console.error('[node-backend]', 'SIGTERM disableSleepGuard failed:', err);
    });
  }
});

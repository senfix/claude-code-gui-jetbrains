import { exec, spawn, type ChildProcess } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SleepGuardStatus {
  enabled: boolean;
  onlyOnPower: boolean;
  platform: string;
}

let sleepGuardEnabled = false;
let sleepOnlyOnPower = true;
let inhibitProcess: ChildProcess | null = null; // Linux only

export async function enableSleepGuard(onlyOnPower: boolean): Promise<void> {
  const platform = process.platform;
  sleepOnlyOnPower = onlyOnPower;

  try {
    if (platform === 'darwin') {
      const pmsetFlag = onlyOnPower ? '-c' : '-a';
      await execAsync(
        `osascript -e 'do shell script "pmset ${pmsetFlag} disablesleep 1" with administrator privileges'`
      );
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
      if (!onlyOnPower) {
        await execAsync('powercfg /change standby-timeout-dc 0');
      }
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
      await execAsync(
        `osascript -e 'do shell script "pmset disablesleep 0" with administrator privileges'`
      );
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
      if (!sleepOnlyOnPower) {
        await execAsync('powercfg /change standby-timeout-dc 15');
      }
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

export function getSleepGuardStatus(): SleepGuardStatus {
  return {
    enabled: sleepGuardEnabled,
    onlyOnPower: sleepOnlyOnPower,
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

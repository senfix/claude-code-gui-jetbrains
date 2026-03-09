import { exec } from 'child_process';
import type { Bridge } from './bridge-interface';
import { readSettingsFile } from '../core/features/settings';

/**
 * Browser-mode bridge for dev environment.
 * Uses OS-native commands for file opening; other IDE-specific
 * operations are no-ops since there is no IDE host.
 */
export class BrowserBridge implements Bridge {
  async openFile(path: string): Promise<void> {
    return new Promise<void>((resolve) => {
      let command: string;
      if (process.platform === 'darwin') {
        command = `open "${path}"`;
      } else if (process.platform === 'win32') {
        command = `start "" "${path}"`;
      } else {
        command = `xdg-open "${path}"`;
      }

      exec(command, (err) => {
        if (err) {
          console.error('[node-backend]', 'Failed to open file:', err.message);
        }
        resolve();
      });
    });
  }

  async openDiff(): Promise<void> {
    // no-op: diff viewer not available in browser mode
  }

  async applyDiff(): Promise<{ applied: boolean }> {
    return { applied: false };
  }

  async rejectDiff(): Promise<void> {
    // no-op
  }

  async newSession(): Promise<void> {
    // no-op: handled by session reset in browser mode
  }

  async openSettings(): Promise<void> {
    // no-op
  }

  async openUrl(url: string): Promise<void> {
    return new Promise<void>((resolve) => {
      let command: string;
      if (process.platform === 'darwin') {
        command = `open "${url}"`;
      } else if (process.platform === 'win32') {
        command = `start "" "${url}"`;
      } else {
        command = `xdg-open "${url}"`;
      }

      exec(command, (err) => {
        if (err) {
          console.error('[node-backend]', 'Failed to open URL:', err.message);
        }
        resolve();
      });
    });
  }

  async pickFiles(options: {
    mode: 'files' | 'folders' | 'both';
    multiple?: boolean;
  }): Promise<{ paths: string[] }> {
    const { mode, multiple = true } = options;

    if (process.platform === 'darwin') {
      return this.pickFilesMacOS(mode, multiple);
    } else if (process.platform === 'win32') {
      return this.pickFilesWindows(mode, multiple);
    } else {
      return this.pickFilesLinux(mode, multiple);
    }
  }

  private pickFilesMacOS(mode: string, multiple: boolean): Promise<{ paths: string[] }> {
    return new Promise((resolve) => {
      let script: string;
      const multipleClause = multiple ? ' with multiple selections allowed' : '';

      if (mode === 'folders') {
        if (multiple) {
          script = `
            set chosen to choose folder with prompt "Select folders"${multipleClause}
            set posixPaths to ""
            repeat with f in chosen
              set posixPaths to posixPaths & POSIX path of f & "\\n"
            end repeat
            return posixPaths
          `;
        } else {
          script = `return POSIX path of (choose folder with prompt "Select a folder")`;
        }
      } else {
        // mode === 'files' or 'both'
        if (multiple) {
          script = `
            set chosen to choose file with prompt "Select files"${multipleClause}
            set posixPaths to ""
            repeat with f in chosen
              set posixPaths to posixPaths & POSIX path of f & "\\n"
            end repeat
            return posixPaths
          `;
        } else {
          script = `return POSIX path of (choose file with prompt "Select a file")`;
        }
      }

      exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (err, stdout) => {
        if (err) {
          // 사용자가 취소하면 에러가 발생 — 빈 배열 반환
          console.error('[node-backend]', 'pickFiles cancelled or failed:', err.message);
          resolve({ paths: [] });
          return;
        }

        const paths = stdout.trim().split('\n').filter((p) => p.length > 0);
        resolve({ paths });
      });
    });
  }

  private pickFilesWindows(mode: string, multiple: boolean): Promise<{ paths: string[] }> {
    return new Promise((resolve) => {
      let script: string;

      if (mode === 'folders') {
        // FolderBrowserDialog — 단일 선택만 지원
        script = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = "Select a folder"
if ($dialog.ShowDialog() -eq 'OK') {
  Write-Output $dialog.SelectedPath
}`;
      } else {
        // OpenFileDialog
        script = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = "Select files"
$dialog.Filter = "All files (*.*)|*.*"
${multiple ? '$dialog.Multiselect = $true' : ''}
if ($dialog.ShowDialog() -eq 'OK') {
  $dialog.FileNames | ForEach-Object { Write-Output $_ }
}`;
      }

      exec(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, (err, stdout) => {
        if (err) {
          console.error('[node-backend]', 'pickFiles cancelled or failed:', err.message);
          resolve({ paths: [] });
          return;
        }
        const paths = stdout.trim().split('\r\n').filter((p) => p.length > 0);
        resolve({ paths });
      });
    });
  }

  private pickFilesLinux(mode: string, multiple: boolean): Promise<{ paths: string[] }> {
    return new Promise((resolve) => {
      const args: string[] = ['--file-selection'];

      if (mode === 'folders') {
        args.push('--directory');
        args.push('--title=Select folders');
      } else {
        args.push('--title=Select files');
      }

      if (multiple) {
        args.push('--multiple');
        args.push('--separator=\\n');
      }

      exec(`zenity ${args.join(' ')}`, (err, stdout) => {
        if (err) {
          // 사용자 취소 시 exit code 1
          console.error('[node-backend]', 'pickFiles cancelled or failed:', err.message);
          resolve({ paths: [] });
          return;
        }
        const paths = stdout.trim().split('\n').filter((p) => p.length > 0);
        resolve({ paths });
      });
    });
  }

  async updatePlugin(): Promise<void> {
    return new Promise<void>((resolve) => {
      const url = 'https://plugins.jetbrains.com/plugin/30313-claude-code-with-gui';
      let command: string;
      if (process.platform === 'darwin') {
        command = `open "${url}"`;
      } else if (process.platform === 'win32') {
        command = `start "" "${url}"`;
      } else {
        command = `xdg-open "${url}"`;
      }

      exec(command, (err) => {
        if (err) {
          console.error('[node-backend]', 'Failed to open plugin marketplace URL:', err.message);
        }
        resolve();
      });
    });
  }

  async requiresRestart(): Promise<boolean> {
    return true;
  }

  async openTerminal(workingDir: string): Promise<void> {
    const settings = await readSettingsFile();
    const terminalApp = settings['terminalApp'] as string | null;

    const claudePath = await new Promise<string>((resolve) => {
      const cmd = process.platform === 'win32' ? 'where claude' : 'which claude';
      exec(cmd, (err, stdout) => {
        resolve(err ? 'claude' : stdout.trim().split('\n')[0]);
      });
    });

    if (process.platform === 'darwin') {
      const app = terminalApp || 'Terminal';
      const escapedDir = workingDir.replace(/"/g, '\\"');
      const isITerm = app === 'iTerm' || app === 'iTerm2' || app.toLowerCase().includes('iterm');
      const script = isITerm
        ? `tell application "${app}"
             activate
             set newWindow to (create window with default profile)
             tell current session of newWindow
               write text "cd \\"${escapedDir}\\"; ${claudePath}"
             end tell
           end tell`
        : `tell application "${app}"
             activate
             do script "cd \\"${escapedDir}\\"; ${claudePath}"
           end tell`;

      exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (err) => {
        if (err) {
          console.error('[node-backend]', 'Failed to open terminal:', err.message);
        }
      });
    } else if (process.platform === 'win32') {
      let command: string;
      const app = terminalApp ?? '';

      if (!app) {
        command = `start cmd /k "cd /d \\"${workingDir}\\" && claude"`;
      } else if (app === 'Windows Terminal' || app === 'wt') {
        command = `wt -d "${workingDir}" cmd /k claude`;
      } else if (app === 'PowerShell' || app === 'powershell') {
        command = `start powershell -NoExit -Command "cd '${workingDir}'; claude"`;
      } else if (app === 'Git Bash' || app === 'bash') {
        const gitBashPath = `${process.env['PROGRAMFILES'] ?? 'C:\\Program Files'}\\Git\\bin\\bash.exe`;
        command = `start "" "${gitBashPath}" --cd="${workingDir}" -c "claude; exec bash"`;
      } else {
        command = `start "" "${app}" "${workingDir}"`;
      }

      exec(command, (err) => {
        if (err) {
          console.error('[node-backend]', 'Failed to open terminal:', err.message);
        }
      });
    } else {
      const terminal = terminalApp || 'x-terminal-emulator';
      exec(`${terminal} -e "cd '${workingDir}'; ${claudePath}"`, (err) => {
        if (err) {
          console.error('[node-backend]', 'Failed to open terminal:', err.message);
        }
      });
    }
  }
}

import { execSync } from 'child_process';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';

/**
 * Read Claude Code OAuth access token from system credentials.
 * macOS: Keychain, Linux: ~/.claude/.credentials.json
 */
export async function getClaudeAccessToken(): Promise<string | null> {
  if (platform() === 'darwin') {
    try {
      const raw = execSync(
        'security find-generic-password -s "Claude Code-credentials" -w',
        { encoding: 'utf-8', timeout: 5000 }
      ).trim();
      const parsed = JSON.parse(raw);
      return parsed?.claudeAiOauth?.accessToken ?? null;
    } catch {
      return null;
    }
  }

  // Linux fallback
  const credPath = join(homedir(), '.claude', '.credentials.json');
  if (!existsSync(credPath)) return null;
  try {
    const raw = await readFile(credPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed?.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
}

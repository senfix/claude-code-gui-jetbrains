import { join } from 'path';
import { homedir } from 'os';
import { log, green, label } from '../log';

export async function getProjectSessionsPath(workingDir: string): Promise<string> {
  // Convert project path to Claude's folder format (keeps leading dash)
  const normalizedPath = workingDir.replace(/\//g, '-');
  const sessionPath = join(homedir(), '.claude', 'projects', normalizedPath);
  log(label('Sessions path:'), green(sessionPath));
  return sessionPath;
}

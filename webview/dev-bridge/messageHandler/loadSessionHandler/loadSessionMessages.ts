import { readFile } from 'fs/promises';
import { join } from 'path';
import { getProjectSessionsPath } from '../../features/getProjectSessionsPath';
import { error } from '../../log';

// Raw JSONL entry - passed through as-is to match Kotlin backend
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SessionMessage = Record<string, any>;

export async function loadSessionMessages(workingDir: string, targetSessionId: string): Promise<SessionMessage[]> {
  try {
    const sessionsPath = await getProjectSessionsPath(workingDir);
    const sessionFile = join(sessionsPath, `${targetSessionId}.jsonl`);

    const content = await readFile(sessionFile, 'utf-8');
    const lines = content.trim().split('\n');

    const messages: SessionMessage[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const entry = JSON.parse(line);
        // Raw JSONL entry 그대로 전달 (type 필터링 제거)
        messages.push(entry);
      } catch {
        // Skip invalid JSON lines
      }
    }

    return messages;
  } catch (err) {
    error('Error loading session:', err);
    return [];
  }
}

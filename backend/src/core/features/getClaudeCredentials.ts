import { readClaudeSettings } from './claude-settings';

export type TokenType = 'oauth' | 'apikey';

export interface AccessTokenResult {
  token: string;
  type: TokenType;
}

export async function getClaudeAccessToken(): Promise<AccessTokenResult | null> {
  const settings = await readClaudeSettings();
  const env = (settings?.env ?? {}) as Record<string, string>;

  if (env.CLAUDE_CODE_OAUTH_TOKEN) {
    return { token: env.CLAUDE_CODE_OAUTH_TOKEN, type: 'oauth' };
  }

  if (env.ANTHROPIC_API_KEY) {
    return { token: env.ANTHROPIC_API_KEY, type: 'apikey' };
  }

  return null;
}

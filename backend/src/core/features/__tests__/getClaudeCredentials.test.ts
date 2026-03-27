import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClaudeAccessToken } from '../getClaudeCredentials';

vi.mock('../claude-settings', () => ({
  readClaudeSettings: vi.fn(),
}));

import { readClaudeSettings } from '../claude-settings';

const mockReadClaudeSettings = vi.mocked(readClaudeSettings);

describe('getClaudeAccessToken()', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns oauth token when CLAUDE_CODE_OAUTH_TOKEN is set in env', async () => {
    mockReadClaudeSettings.mockResolvedValue({
      env: { CLAUDE_CODE_OAUTH_TOKEN: 'oauth-token-123' },
    } as never);

    const result = await getClaudeAccessToken();

    expect(result).toEqual({ token: 'oauth-token-123', type: 'oauth' });
  });

  it('returns apikey token when only ANTHROPIC_API_KEY is set in env', async () => {
    mockReadClaudeSettings.mockResolvedValue({
      env: { ANTHROPIC_API_KEY: 'sk-ant-key-456' },
    } as never);

    const result = await getClaudeAccessToken();

    expect(result).toEqual({ token: 'sk-ant-key-456', type: 'apikey' });
  });

  it('returns null when neither token is set', async () => {
    mockReadClaudeSettings.mockResolvedValue({
      env: { SOME_OTHER_KEY: 'value' },
    } as never);

    const result = await getClaudeAccessToken();

    expect(result).toBeNull();
  });

  it('oauth token takes priority over API key when both are set', async () => {
    mockReadClaudeSettings.mockResolvedValue({
      env: {
        CLAUDE_CODE_OAUTH_TOKEN: 'oauth-token-first',
        ANTHROPIC_API_KEY: 'sk-ant-key-second',
      },
    } as never);

    const result = await getClaudeAccessToken();

    expect(result).toEqual({ token: 'oauth-token-first', type: 'oauth' });
  });

  it('returns null when env key is missing from settings', async () => {
    mockReadClaudeSettings.mockResolvedValue({
      someOtherField: 'value',
    } as never);

    const result = await getClaudeAccessToken();

    expect(result).toBeNull();
  });

  it('returns null when settings are empty', async () => {
    mockReadClaudeSettings.mockResolvedValue(null);

    const result = await getClaudeAccessToken();

    expect(result).toBeNull();
  });
});

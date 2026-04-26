import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  watch: vi.fn(),
}));

vi.mock('os', () => ({
  homedir: vi.fn(() => '/mock-home'),
}));

import { readFile } from 'fs/promises';
import { getStrippableAuthEnvKeys } from '../claude-settings';

const mockReadFile = vi.mocked(readFile);

const HOME_SETTINGS = '/mock-home/.claude/settings.json';
const HOME_SETTINGS_LOCAL = '/mock-home/.claude/settings.local.json';
const PROJECT_DIR = '/mock-project';
const PROJECT_SETTINGS = `${PROJECT_DIR}/.claude/settings.json`;
const PROJECT_SETTINGS_LOCAL = `${PROJECT_DIR}/.claude/settings.local.json`;

function mockSettingsByPath(map: Record<string, unknown>): void {
  mockReadFile.mockImplementation((p: unknown) => {
    const path = String(p);
    if (path in map) {
      return Promise.resolve(JSON.stringify(map[path]) as never);
    }
    return Promise.reject(new Error(`ENOENT: ${path}`));
  });
}

describe('getStrippableAuthEnvKeys()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ALL OAuth-related env keys when no settings file specifies any of them', async () => {
    mockSettingsByPath({
      [HOME_SETTINGS]: { env: {} },
      [HOME_SETTINGS_LOCAL]: {},
    });
    const keys = await getStrippableAuthEnvKeys();
    expect(keys).toEqual(
      expect.arrayContaining([
        'ANTHROPIC_API_KEY',
        'CLAUDE_CODE_OAUTH_TOKEN',
        'CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR',
      ]),
    );
    expect(keys).toHaveLength(3);
  });

  it('returns ALL keys when settings files do not exist at all', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    const keys = await getStrippableAuthEnvKeys();
    expect(keys).toEqual(
      expect.arrayContaining([
        'ANTHROPIC_API_KEY',
        'CLAUDE_CODE_OAUTH_TOKEN',
        'CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR',
      ]),
    );
    expect(keys).toHaveLength(3);
  });

  it('excludes a key when user explicitly sets it in global settings.json env', async () => {
    mockSettingsByPath({
      [HOME_SETTINGS]: { env: { ANTHROPIC_API_KEY: 'sk-ant-user-pinned' } },
      [HOME_SETTINGS_LOCAL]: {},
    });
    const keys = await getStrippableAuthEnvKeys();
    expect(keys).not.toContain('ANTHROPIC_API_KEY');
    expect(keys).toContain('CLAUDE_CODE_OAUTH_TOKEN');
    expect(keys).toContain('CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR');
  });

  it('excludes a key when user explicitly sets it in settings.local.json env', async () => {
    mockSettingsByPath({
      [HOME_SETTINGS]: {},
      [HOME_SETTINGS_LOCAL]: { env: { CLAUDE_CODE_OAUTH_TOKEN: 'token-from-local' } },
    });
    const keys = await getStrippableAuthEnvKeys();
    expect(keys).not.toContain('CLAUDE_CODE_OAUTH_TOKEN');
    expect(keys).toContain('ANTHROPIC_API_KEY');
  });

  it('excludes a key when user explicitly sets it in project settings.json env', async () => {
    mockSettingsByPath({
      [HOME_SETTINGS]: {},
      [HOME_SETTINGS_LOCAL]: {},
      [PROJECT_SETTINGS]: { env: { ANTHROPIC_API_KEY: 'project-api-key' } },
      [PROJECT_SETTINGS_LOCAL]: {},
    });
    const keys = await getStrippableAuthEnvKeys(PROJECT_DIR);
    expect(keys).not.toContain('ANTHROPIC_API_KEY');
    expect(keys).toContain('CLAUDE_CODE_OAUTH_TOKEN');
  });

  it('excludes a key when user explicitly sets it in project settings.local.json env', async () => {
    mockSettingsByPath({
      [HOME_SETTINGS]: {},
      [HOME_SETTINGS_LOCAL]: {},
      [PROJECT_SETTINGS]: {},
      [PROJECT_SETTINGS_LOCAL]: { env: { CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR: '7' } },
    });
    const keys = await getStrippableAuthEnvKeys(PROJECT_DIR);
    expect(keys).not.toContain('CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR');
    expect(keys).toContain('ANTHROPIC_API_KEY');
    expect(keys).toContain('CLAUDE_CODE_OAUTH_TOKEN');
  });

  it('treats env as empty when settings.env is not an object (malformed)', async () => {
    mockSettingsByPath({
      [HOME_SETTINGS]: { env: 'not-an-object' },
      [HOME_SETTINGS_LOCAL]: {},
    });
    const keys = await getStrippableAuthEnvKeys();
    expect(keys).toHaveLength(3);
  });

  it('honors precedence: project explicit overrides global, but global explicit alone is enough', async () => {
    // ANTHROPIC_API_KEY explicit only in project; CLAUDE_CODE_OAUTH_TOKEN explicit only in global
    mockSettingsByPath({
      [HOME_SETTINGS]: { env: { CLAUDE_CODE_OAUTH_TOKEN: 'g' } },
      [HOME_SETTINGS_LOCAL]: {},
      [PROJECT_SETTINGS]: { env: { ANTHROPIC_API_KEY: 'p' } },
      [PROJECT_SETTINGS_LOCAL]: {},
    });
    const keys = await getStrippableAuthEnvKeys(PROJECT_DIR);
    expect(keys).toEqual(['CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR']);
  });
});

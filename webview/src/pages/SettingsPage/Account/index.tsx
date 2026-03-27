import { useState, useEffect, useCallback } from 'react';
import { SettingSection } from '../common';
import { SettingDescription } from '../common/SettingDescription';
import { ROUTE_META, Route } from '@/router/routes';
import { useClaudeSettings } from '@/contexts/ClaudeSettingsContext';
import { TokenField } from './TokenField';
import { OAuthTokenGuide } from './OAuthTokenGuide';
import { useAccountData } from '@/components/AccountUsageModal/useAccountData';
import { InfoRow, InfoRowSkeleton } from '@/components/AccountUsageModal/InfoRow';

interface EnvRecord {
  CLAUDE_CODE_OAUTH_TOKEN?: string;
  ANTHROPIC_API_KEY?: string;
  [key: string]: string | undefined;
}

function getEnv(settings: Record<string, unknown>): EnvRecord {
  return (settings?.env ?? {}) as EnvRecord;
}

export function AccountSettings() {
  const meta = ROUTE_META[Route.SETTINGS_ACCOUNT];
  const { settings, updateSetting } = useClaudeSettings();
  const { data: accountData, isLoading: accountLoading, refetch: refetchAccount } = useAccountData();

  const env = getEnv(settings as Record<string, unknown>);
  const [oauthToken, setOauthToken] = useState(env.CLAUDE_CODE_OAUTH_TOKEN ?? '');
  const [apiKey, setApiKey] = useState(env.ANTHROPIC_API_KEY ?? '');

  useEffect(() => {
    setOauthToken(env.CLAUDE_CODE_OAUTH_TOKEN ?? '');
    setApiKey(env.ANTHROPIC_API_KEY ?? '');
  }, [env.CLAUDE_CODE_OAUTH_TOKEN, env.ANTHROPIC_API_KEY]);

  const saveEnv = useCallback(async (key: string, value: string) => {
    const currentEnv = getEnv(settings as Record<string, unknown>);
    const newEnv = { ...currentEnv };
    if (value.trim()) {
      newEnv[key] = value.trim();
    } else {
      delete newEnv[key];
    }
    await updateSetting('env' as keyof typeof settings, newEnv as never);
  }, [settings, updateSetting]);

  const handleOauthSave = useCallback(async (value: string) => {
    setOauthToken(value);
    await saveEnv('CLAUDE_CODE_OAUTH_TOKEN', value);
    setTimeout(refetchAccount, 500);
  }, [saveEnv, refetchAccount]);

  const handleApiKeySave = useCallback(async (value: string) => {
    setApiKey(value);
    await saveEnv('ANTHROPIC_API_KEY', value);
    setTimeout(refetchAccount, 500);
  }, [saveEnv, refetchAccount]);

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-100 mb-6">{meta.label}</h2>

      <SettingSection title="Profile">
        {accountLoading && !accountData ? (
          <>
            <InfoRowSkeleton />
            <InfoRowSkeleton />
            <InfoRowSkeleton />
          </>
        ) : (
          <div className="py-3">
            <InfoRow label="Auth method" value={accountData?.authMethod ?? null} />
            <InfoRow label="Email" value={accountData?.email ?? null} />
            <InfoRow label="Plan" value={accountData?.plan ?? null} />
          </div>
        )}
      </SettingSection>

      <SettingSection title="API Tokens" description={
        <>
          <p className="text-[11px] font-normal text-zinc-500 -mt-4">Tokens are stored in <code className="text-[11px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">~/.claude/settings.json</code> under the &quot;env&quot; key.</p>
          <p className="text-[11px] font-normal text-zinc-500 mt-4 mb-3">Only one is needed. Fill in whichever applies to you. Priority: OAuth Token &gt; API Key.</p>
        </>
      }>
        <div className="py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-200">OAuth Token</label>
            <code className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">CLAUDE_CODE_OAUTH_TOKEN</code>
          </div>
          <OAuthTokenGuide />
          <div className="mt-2">
            <TokenField
              value={oauthToken}
              placeholder="sk-ant-oat01-..."
              onSave={handleOauthSave}
            />
          </div>
        </div>
        <div className="py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-200">API Key</label>
            <code className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">ANTHROPIC_API_KEY</code>
          </div>
          <SettingDescription>
            If you have an Anthropic API key, paste it here. Usage tracking is not available with API keys.
          </SettingDescription>
          <div className="mt-2">
            <TokenField
              value={apiKey}
              placeholder="sk-ant-api03-..."
              onSave={handleApiKeySave}
            />
          </div>
        </div>
      </SettingSection>
    </div>
  );
}

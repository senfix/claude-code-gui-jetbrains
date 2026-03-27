import type { ConnectionManager } from '../../ws/connection-manager';
import type { Bridge } from '../../bridge/bridge-interface';
import type { IPCMessage } from '../types';
import { getClaudeAccessToken } from '../features/getClaudeCredentials';

interface OAuthProfileResponse {
  account: {
    email?: string;
    display_name?: string;
    created_at?: string;
  };
  organization: {
    uuid?: string;
    name?: string;
    organization_type?: string;
    billing_type?: string;
    has_extra_usage_enabled?: boolean;
  };
}

interface AccountResult {
  loggedIn: boolean;
  authMethod: string;
  email: string | null;
  subscriptionType: string | null;
  orgId: string | null;
  orgName: string | null;
}

function snakeToPascal(s: string | undefined): string | null {
  if (!s) return null;
  return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

async function fetchOAuthProfile(token: string): Promise<OAuthProfileResponse | null> {
  try {
    const response = await fetch('https://api.anthropic.com/api/oauth/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return null;
    return await response.json() as OAuthProfileResponse;
  } catch {
    return null;
  }
}

export async function getAccountHandler(
  connectionId: string,
  message: IPCMessage,
  connections: ConnectionManager,
  _bridge: Bridge,
): Promise<void> {
  const tokenResult = await getClaudeAccessToken();

  if (!tokenResult) {
    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: 'error',
      error: 'No token configured. Set a token in Settings > General > Account.',
    });
    return;
  }

  const account: AccountResult = {
    loggedIn: true,
    authMethod: tokenResult.type === 'oauth' ? 'claude.ai' : 'api-key',
    email: null,
    subscriptionType: null,
    orgId: null,
    orgName: null,
  };

  if (tokenResult.type === 'oauth') {
    const profile = await fetchOAuthProfile(tokenResult.token);
    if (profile) {
      account.email = profile.account?.email ?? null;
      account.subscriptionType = snakeToPascal(profile.organization?.organization_type);
      account.orgId = profile.organization?.uuid ?? null;
      account.orgName = profile.organization?.name ?? null;
    }
  }

  connections.sendTo(connectionId, 'ACK', {
    requestId: message.requestId,
    status: 'ok',
    account,
  });
}

import type { ConnectionManager } from '../../ws/connection-manager';
import type { Bridge } from '../../bridge/bridge-interface';
import type { IPCMessage } from '../types';
import { getClaudeAccessToken } from '../features/getClaudeCredentials';

const CACHE_TTL_MS = 60_000;
let cachedUsage: unknown = null;
let cachedAt = 0;
let rateLimitedUntil: number = 0;
let inflightPromise: Promise<unknown> | null = null;

export async function getUsageHandler(
  connectionId: string,
  message: IPCMessage,
  connections: ConnectionManager,
  _bridge: Bridge,
): Promise<void> {
  const accessToken = await getClaudeAccessToken();
  if (!accessToken) {
    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: 'error',
      error: 'Claude Code credentials not found. Please log in with Claude Code CLI first.',
    });
    return;
  }

  if (cachedUsage !== null && Date.now() - cachedAt < CACHE_TTL_MS) {
    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: 'ok',
      usage: cachedUsage,
    });
    return;
  }

  if (Date.now() < rateLimitedUntil) {
    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: cachedUsage !== null ? 'ok' : 'error',
      ...(cachedUsage !== null ? { usage: cachedUsage } : { error: 'Rate limited. Please try again later.' }),
    });
    return;
  }

  try {
    if (inflightPromise !== null) {
      try {
        await inflightPromise;
      } catch {
        // inflight reject를 흡수하고 cachedUsage 기반으로 응답
      }
      connections.sendTo(connectionId, 'ACK', {
        requestId: message.requestId,
        status: cachedUsage !== null ? 'ok' : 'error',
        ...(cachedUsage !== null ? { usage: cachedUsage } : { error: 'Usage fetch failed' }),
      });
      return;
    }

    inflightPromise = (async () => {
      const response = await fetch('https://api.anthropic.com/api/oauth/usage', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'anthropic-beta': 'oauth-2025-04-20',
        },
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const parsed = retryAfter ? parseInt(retryAfter, 10) : NaN;
        const retryAfterSec = !isNaN(parsed) ? parsed : 60;
        rateLimitedUntil = Date.now() + retryAfterSec * 1000;
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const usage = await response.json();
      cachedUsage = usage;
      cachedAt = Date.now();
      return usage;
    })();

    const usage = await inflightPromise;

    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: 'ok',
      usage,
    });
  } catch (err) {
    connections.sendTo(connectionId, 'ACK', {
      requestId: message.requestId,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    inflightPromise = null;
  }
}

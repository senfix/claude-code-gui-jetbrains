import type { WebSocket } from 'ws';
import type { IPCMessage } from '../../features/types';
import { sendToClient } from '../../features/sendToClient';
import { getClaudeAccessToken } from '../../features/getClaudeCredentials';

export async function getUsageHandler(ws: WebSocket, message: IPCMessage) {
  const accessToken = await getClaudeAccessToken();
  if (!accessToken) {
    sendToClient(ws, 'ACK', {
      requestId: message.requestId,
      status: 'error',
      error: 'Claude Code credentials not found. Please log in with Claude Code CLI first.',
    });
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/api/oauth/usage', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'anthropic-beta': 'oauth-2025-04-20',
      },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const usage = await response.json();

    sendToClient(ws, 'ACK', {
      requestId: message.requestId,
      status: 'ok',
      usage,
    });
  } catch (err) {
    sendToClient(ws, 'ACK', {
      requestId: message.requestId,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

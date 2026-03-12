import type { ConnectionManager } from '../../ws/connection-manager';
import type { Bridge } from '../../bridge/bridge-interface';
import type { IPCMessage } from '../types';
import { sendToolResultToProcess, sendControlResponseToProcess } from '../claude-process';

export function toolResponseHandler(
  connectionId: string,
  message: IPCMessage,
  connections: ConnectionManager,
  _bridge: Bridge,
): void {
  const client = connections.getClient(connectionId);
  const sessionId = client?.subscribedSessionId;

  if (!sessionId) {
    console.error('[node-backend]', 'TOOL_RESPONSE received but no subscribed session');
    connections.sendTo(connectionId, 'ACK', { requestId: message.requestId });
    return;
  }

  const toolUseId = message.payload?.toolUseId as string;
  const approved = (message.payload?.approved as boolean) ?? true;
  const controlRequestId = message.payload?.controlRequestId as string | undefined;

  if (controlRequestId) {
    // AskUserQuestion: control_response 프로토콜
    const response = {
      subtype: 'success' as const,
      request_id: controlRequestId,
      response: approved
        ? { behavior: 'allow', updatedInput: message.payload?.updatedInput }
        : { behavior: 'deny', message: (message.payload?.reason as string) || 'User declined to answer' },
    };
    sendControlResponseToProcess(connections, sessionId, response);
    console.error('[node-backend]', `CONTROL_RESPONSE sent for request ${controlRequestId} (approved: ${approved})`);
  } else {
    // 일반 tool permission: tool_result 방식
    const resultContent =
      (message.payload?.result as string) ||
      (approved ? 'Tool execution approved' : 'Tool execution rejected');

    const toolResult = {
      type: 'tool_result' as const,
      tool_use_id: toolUseId,
      content: resultContent,
      is_error: !approved,
    };
    sendToolResultToProcess(connections, sessionId, toolResult);
    console.error('[node-backend]', `TOOL_RESPONSE sent for tool ${toolUseId} (approved: ${approved})`);
  }

  connections.sendTo(connectionId, 'ACK', { requestId: message.requestId });
}

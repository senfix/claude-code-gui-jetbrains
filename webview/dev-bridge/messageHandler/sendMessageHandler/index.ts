import {broadcastToSession, generateSessionId, IPCMessage, sendToClient, startClaudeProcess} from "../../index";
import type {WebSocket} from "ws";

export function sendMessageHandler(ws: WebSocket, message: IPCMessage) {
    const content = message.payload?.content as string;
    const workingDir = message.payload?.workingDir as string || process.cwd();
    const msgSessionId = message.payload?.sessionId as string | undefined;
    const isNewSession = message.payload?.isNewSession as boolean ?? false;
    const inputMode = message.payload?.inputMode as string;
    const resolvedSessionId = msgSessionId || generateSessionId();
    if (content) {
        startClaudeProcess(ws, content, workingDir, resolvedSessionId, isNewSession, inputMode);
        // 다른 구독자에게 사용자 메시지 브로드캐스트 (보낸 ws 제외)
        broadcastToSession(resolvedSessionId, 'USER_MESSAGE_BROADCAST', {
            content: content.trim(),
            sessionId: resolvedSessionId,
        }, ws);
    }
    sendToClient(ws, 'ACK', { requestId: message.requestId });
}

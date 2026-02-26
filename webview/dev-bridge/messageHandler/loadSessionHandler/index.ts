import type {WebSocket} from "ws";
import {IPCMessage, sendToClient, subscribeToSession} from "../../index";
import {loadSessionMessages} from "./loadSessionMessages";

export async function loadSessionHandler(ws: WebSocket, message: IPCMessage) {
    const loadWorkingDir = message.payload?.workingDir as string || process.cwd();
    const loadSessionId = message.payload?.sessionId as string;
    if (loadSessionId) {
        subscribeToSession(ws, loadSessionId);
        const loadedMessages = await loadSessionMessages(loadWorkingDir, loadSessionId);
        sendToClient(ws, 'SESSION_LOADED', {
            sessionId: loadSessionId,
            messages: loadedMessages
        });
    }
    sendToClient(ws, 'ACK', { requestId: message.requestId });
}

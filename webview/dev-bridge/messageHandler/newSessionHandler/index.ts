import type {WebSocket} from "ws";
import {IPCMessage, sendToClient, unsubscribeFromSession} from "../../index";
import {log} from "../../log";

export function newSessionHandler(ws: WebSocket, message: IPCMessage) {
    unsubscribeFromSession(ws);
    log('Client unsubscribed, will create new session on next message');
    sendToClient(ws, 'ACK', { requestId: message.requestId });
}

import type {WebSocket} from "ws";
import {IPCMessage, sendToClient} from "../../index";
import {log} from "../../log";

export function openSettingsHandler(ws: WebSocket, message: IPCMessage) {
    log('OPEN_SETTINGS requested (browser handles via window.open)');
    sendToClient(ws, 'ACK', { requestId: message.requestId });
}

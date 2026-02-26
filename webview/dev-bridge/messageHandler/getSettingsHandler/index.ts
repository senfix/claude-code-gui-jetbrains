import type {WebSocket} from "ws";
import {IPCMessage, sendToClient} from "../../index";
import {readSettingsFile} from "./settings";

export async function getSettingsHandler(ws: WebSocket, message: IPCMessage) {
    const settings = await readSettingsFile();
    sendToClient(ws, 'ACK', {
        requestId: message.requestId,
        status: 'ok',
        settings,
    });
}

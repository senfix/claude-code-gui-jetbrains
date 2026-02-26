import type {WebSocket} from "ws";
import {IPCMessage, sendToClient} from "../../index";
import {saveSettingToFile} from "../getSettingsHandler/settings";

export async function saveSettingsHandler(ws: WebSocket, message: IPCMessage) {
    const key = message.payload?.key as string;
    const value = message.payload?.value;
    const result = await saveSettingToFile(key, value);
    sendToClient(ws, 'ACK', {
        requestId: message.requestId,
        ...result,
    });
}

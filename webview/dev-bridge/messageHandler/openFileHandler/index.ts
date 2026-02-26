import {exec} from "child_process";
import type {WebSocket} from "ws";
import {IPCMessage, sendToClient} from "../../index";
import {error, log} from "../../log";

export function openFileHandler(ws: WebSocket, message: IPCMessage) {
    const openFilePath = message.payload?.filePath as string;
    if (openFilePath) {
        log('Opening file:', openFilePath);
        try {
            exec(`open "${openFilePath}"`, (execErr: Error | null) => {
                if (execErr) {
                    error('Failed to open file:', execErr.message);
                }
            });
        } catch (err) {
            error('Failed to open file:', err);
        }
    }
    sendToClient(ws, 'ACK', { requestId: message.requestId });
}

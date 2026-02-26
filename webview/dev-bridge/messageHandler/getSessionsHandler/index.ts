import type {WebSocket} from "ws";
import {IPCMessage, sendToClient} from "../../index";
import {getSessionsList} from "./getSessionsList";

export async function getSessionsHandler(ws: WebSocket, message: IPCMessage) {
    const sessionsWorkingDir = message.payload?.workingDir as string || process.cwd();
    const sessions = await getSessionsList(sessionsWorkingDir);
    sendToClient(ws, 'ACK', { requestId: message.requestId, sessions });
}

import type {WebSocket} from "ws";
import {IPCMessage, sendToClient} from "../../index";
import {getProjectsList} from "./getProjectsList";

export async function getProjectsHandler(ws: WebSocket, message: IPCMessage) {
    const projects = await getProjectsList();
    sendToClient(ws, 'PROJECTS_LIST', { projects });
    sendToClient(ws, 'ACK', { requestId: message.requestId });
}

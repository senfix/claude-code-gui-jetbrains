import type {WebSocket} from "ws";
import {IPCMessage, sendToClient} from "../../index";
import {clientRegistry, sessionRegistry} from "../../registries";
import {log} from "../../log";

export function stopGenerationHandler(ws: WebSocket, message: IPCMessage) {
    const client = clientRegistry.get(ws);
    if (client?.subscribedSessionId) {
        const session = sessionRegistry.get(client.subscribedSessionId);
        if (session?.process) {
            log(`Stopping process for session ${client.subscribedSessionId}`);
            session.process.kill('SIGTERM');
            // process = null은 close 이벤트에서 처리됨
        }
    }
    sendToClient(ws, 'ACK', { requestId: message.requestId });
}

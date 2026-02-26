import {ChildProcess} from "child_process";
import type {WebSocket} from "ws";

// ─── Session Registry (Pub/Sub) ─────────────────────────────────────────────

interface SessionRecord {
    sessionId: string;
    process: ChildProcess | null;
    subscribers: Set<WebSocket>;
    buffer: string;          // stdout 파싱용 줄 버퍼
    workingDir: string;
}

interface ClientRecord {
    subscribedSessionId: string | null;
}

/** sessionId -> SessionRecord */
export const sessionRegistry = new Map<string, SessionRecord>();

/** ws -> ClientRecord */
export const clientRegistry = new Map<WebSocket, ClientRecord>();

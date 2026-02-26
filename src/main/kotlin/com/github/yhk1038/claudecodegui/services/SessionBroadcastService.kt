package com.github.yhk1038.claudecodegui.services

import com.intellij.openapi.Disposable
import com.intellij.openapi.diagnostic.Logger
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArraySet

/**
 * Project-level service that manages session subscriptions and broadcasts
 * streaming events to all WebView tabs viewing the same session.
 *
 * This mirrors the Pub/Sub pattern implemented in dev-bridge.ts for the
 * development WebSocket server.
 */
class SessionBroadcastService : Disposable {

    private val logger = Logger.getInstance(SessionBroadcastService::class.java)

    /**
     * Interface for targets that can receive broadcast messages.
     * Implemented by WebViewBridge to route messages to its ClaudeCodePanel.
     */
    interface BroadcastTarget {
        fun sendBroadcastMessage(type: String, payload: Map<String, Any?>)
    }

    /** sessionId -> set of subscribed targets */
    private val subscribers = ConcurrentHashMap<String, CopyOnWriteArraySet<BroadcastTarget>>()

    /** target -> currently subscribed sessionId */
    private val targetSessions = ConcurrentHashMap<BroadcastTarget, String>()

    /**
     * Subscribe a target to a session. Automatically unsubscribes from any
     * previously subscribed session first.
     */
    fun subscribe(sessionId: String, target: BroadcastTarget) {
        // Unsubscribe from previous session
        unsubscribe(target)

        // Subscribe to new session
        subscribers.getOrPut(sessionId) { CopyOnWriteArraySet() }.add(target)
        targetSessions[target] = sessionId

        val count = subscribers[sessionId]?.size ?: 0
        logger.info("Target subscribed to session $sessionId (subscribers: $count)")
    }

    /**
     * Unsubscribe a target from its current session.
     * Does nothing if the target has no active subscription.
     */
    fun unsubscribe(target: BroadcastTarget) {
        val sessionId = targetSessions.remove(target) ?: return

        subscribers[sessionId]?.remove(target)

        val remaining = subscribers[sessionId]?.size ?: 0
        logger.info("Target unsubscribed from session $sessionId (subscribers: $remaining)")

        // Cleanup empty session entry
        if (remaining == 0) {
            subscribers.remove(sessionId)
        }
    }

    /**
     * Broadcast a message to all targets subscribed to the given session.
     *
     * @param sessionId The session to broadcast to
     * @param type The IPC message type (e.g., "STREAM_EVENT", "ASSISTANT_MESSAGE")
     * @param payload The message payload
     * @param exclude Optional target to exclude from the broadcast (e.g., the sender)
     */
    fun broadcast(
        sessionId: String,
        type: String,
        payload: Map<String, Any?>,
        exclude: BroadcastTarget? = null
    ) {
        val targets = subscribers[sessionId] ?: return

        for (target in targets) {
            if (target === exclude) continue
            try {
                target.sendBroadcastMessage(type, payload)
            } catch (e: Exception) {
                logger.warn("Failed to broadcast to target for session $sessionId: ${e.message}")
            }
        }
    }

    /**
     * Broadcast a message to ALL registered targets across all sessions.
     * Used for session-agnostic events like SESSIONS_UPDATED.
     */
    fun broadcastToAll(type: String, payload: Map<String, Any?>) {
        val allTargets = subscribers.values.flatMap { it }.toSet()
        for (target in allTargets) {
            try {
                target.sendBroadcastMessage(type, payload)
            } catch (e: Exception) {
                logger.warn("Failed to broadcast '$type' to target: ${e.message}")
            }
        }
    }

    /**
     * Get the number of subscribers for a session.
     */
    fun getSubscriberCount(sessionId: String): Int {
        return subscribers[sessionId]?.size ?: 0
    }

    /**
     * Get the session ID that a target is currently subscribed to.
     */
    fun getSubscribedSession(target: BroadcastTarget): String? {
        return targetSessions[target]
    }

    override fun dispose() {
        subscribers.clear()
        targetSessions.clear()
        logger.info("SessionBroadcastService disposed")
    }
}

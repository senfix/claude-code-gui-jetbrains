package com.github.yhk1038.claudecodegui.services

import com.github.yhk1038.claudecodegui.bridge.NodeProcessManager
import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import kotlinx.coroutines.*
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

/**
 * Project-level singleton service that manages a single Node.js backend process.
 *
 * Instead of each ClaudeCodePanel spawning its own NodeProcessManager,
 * all panels share this service so that:
 * - Only one Node.js process runs per project (defect E fix)
 * - Retry creates a new manager in the service field, not a local variable (defect D fix)
 * - All panels connect to the same port
 * - RPC messages are dispatched to the correct panel via CompositeRpcHandler (Change 1)
 * - Backend shuts down automatically when the last panel closes (Change 2)
 * - Zombie processes on the default port are killed before startup (Change 3)
 */
@Service(Service.Level.PROJECT)
class NodeBackendService(private val project: Project) : Disposable {

    private val logger = Logger.getInstance(NodeBackendService::class.java)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private var nodeProcessManager: NodeProcessManager? = null
    private var portDeferred = CompletableDeferred<Int>()
    private val activePanelCount = AtomicInteger(0)

    // Change 1: per-panel RPC handler registry
    private val rpcHandlers = ConcurrentHashMap<String, NodeProcessManager.RpcHandler>()

    // Change 2: delayed shutdown job
    private var shutdownJob: Job? = null

    /**
     * Delegates RPC calls to the first registered panel handler.
     * When multiple panels are open, the first one in iteration order receives the message.
     */
    private inner class CompositeRpcHandler : NodeProcessManager.RpcHandler {
        private fun activeHandler(): NodeProcessManager.RpcHandler? =
            rpcHandlers.values.firstOrNull()

        override suspend fun openFile(path: String) {
            activeHandler()?.openFile(path)
                ?: logger.warn("No active panel handler for openFile")
        }

        override suspend fun openDiff(filePath: String, oldContent: String, newContent: String, toolUseId: String?) {
            activeHandler()?.openDiff(filePath, oldContent, newContent, toolUseId)
                ?: logger.warn("No active panel handler for openDiff")
        }

        override suspend fun applyDiff(filePath: String, newContent: String, toolUseId: String?): Boolean {
            return activeHandler()?.applyDiff(filePath, newContent, toolUseId)
                ?: run { logger.warn("No active panel handler for applyDiff"); false }
        }

        override suspend fun rejectDiff(toolUseId: String?) {
            activeHandler()?.rejectDiff(toolUseId)
                ?: logger.warn("No active panel handler for rejectDiff")
        }

        override suspend fun newSession() {
            activeHandler()?.newSession()
                ?: logger.warn("No active panel handler for newSession")
        }

        override suspend fun openSettings() {
            activeHandler()?.openSettings()
                ?: logger.warn("No active panel handler for openSettings")
        }

        override suspend fun openTerminal(workingDir: String) {
            activeHandler()?.openTerminal(workingDir)
                ?: logger.warn("No active panel handler for openTerminal")
        }

        override suspend fun openUrl(url: String) {
            activeHandler()?.openUrl(url)
                ?: logger.warn("No active panel handler for openUrl")
        }
    }

    /**
     * Ensure the backend is started. Called by each panel on init.
     * First call starts the Node.js process; subsequent calls are no-ops.
     * Registers the panel's RPC handler under its panelId.
     */
    @Synchronized
    fun ensureStarted(panelId: String, rpcHandler: NodeProcessManager.RpcHandler) {
        // Change 2: cancel pending shutdown since a new panel is opening
        shutdownJob?.cancel()
        shutdownJob = null

        rpcHandlers[panelId] = rpcHandler
        activePanelCount.incrementAndGet()
        if (nodeProcessManager == null) {
            startBackend()
        }
    }

    /**
     * Await the backend port. Suspends until the Node.js process prints PORT:{n}.
     */
    suspend fun awaitPort(): Int = portDeferred.await()

    /**
     * Restart the backend. Disposes the current process and starts a new one.
     * Used by retry logic when the initial start fails.
     */
    @Synchronized
    fun restart() {
        stopBackend()
        startBackend()
    }

    /**
     * Called by a panel when it is disposed.
     * Removes the panel's RPC handler and decrements the active panel count.
     * If no panels remain, schedules a delayed backend shutdown.
     */
    fun releasePanel(panelId: String) {
        rpcHandlers.remove(panelId)
        val remaining = activePanelCount.decrementAndGet()
        logger.info("Panel released. Active panels: $remaining")

        // Change 2: schedule backend shutdown when last panel closes
        if (remaining <= 0) {
            shutdownJob = scope.launch {
                delay(SHUTDOWN_DELAY_MS)
                // Re-check count in case a new panel opened during the delay
                if (activePanelCount.get() <= 0) {
                    synchronized(this@NodeBackendService) {
                        stopBackend()
                    }
                    logger.info("Backend stopped: no active panels remaining")
                }
            }
        }
    }

    private fun startBackend() {
        // Change 3: kill any zombie process occupying the default port before starting
        killExistingProcessOnPort(DEFAULT_PORT)

        portDeferred = CompletableDeferred()
        val manager = NodeProcessManager(project, scope)
        nodeProcessManager = manager
        manager.start(CompositeRpcHandler())
        scope.launch {
            try {
                val port = manager.port.await()
                portDeferred.complete(port)
                logger.info("Node.js backend started on port $port")
            } catch (e: Exception) {
                portDeferred.completeExceptionally(e)
                logger.error("Failed to start Node.js backend", e)
            }
        }
    }

    private fun stopBackend() {
        nodeProcessManager?.dispose()
        nodeProcessManager = null
    }

    /**
     * Change 3: Kill any process occupying the given port using lsof (macOS/Linux).
     */
    private fun killExistingProcessOnPort(port: Int) {
        try {
            val lsof = Runtime.getRuntime().exec(arrayOf("lsof", "-ti", ":$port"))
            val output = lsof.inputStream.bufferedReader().readText().trim()
            lsof.waitFor()
            if (output.isNotEmpty()) {
                val pids = output.lines().filter { it.isNotBlank() }
                for (pid in pids) {
                    logger.warn("Killing zombie process on port $port (PID: $pid)")
                    Runtime.getRuntime().exec(arrayOf("kill", "-9", pid)).waitFor()
                }
                Thread.sleep(200)
            }
        } catch (e: Exception) {
            logger.warn("Failed to kill existing process on port $port: ${e.message}")
        }
    }

    override fun dispose() {
        shutdownJob?.cancel()
        stopBackend()
        scope.coroutineContext[Job]?.cancel()
        logger.info("NodeBackendService disposed")
    }

    companion object {
        const val DEFAULT_PORT = 19836

        private const val SHUTDOWN_DELAY_MS = 500L

        fun getInstance(project: Project): NodeBackendService =
            project.getService(NodeBackendService::class.java)
    }
}

package com.github.yhk1038.claudecodegui.editor

import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFileManager
import com.intellij.testFramework.LightVirtualFile
import java.util.Collections
import java.util.WeakHashMap
import java.util.concurrent.ConcurrentHashMap

class ClaudeCodeVirtualFile(
    val sessionId: String,
    val initialPath: String? = null
) : LightVirtualFile("Claude Code", ClaudeCodeFileType, "") {

    // 동적으로 변경 가능한 표시 이름
    @Volatile
    private var displayName: String = "Claude: ${sessionId.take(8)}"

    // WebView가 현재 표시 중인 경로 (탭 이동 시 복원용)
    @Volatile
    var currentPath: String? = initialPath

    companion object {
        private const val MAX_DISPLAY_NAME_LENGTH = 20
        private val openSessions = Collections.synchronizedMap(
            WeakHashMap<Project, MutableMap<String, ClaudeCodeVirtualFile>>()
        )

        fun getOrCreate(project: Project, sessionId: String, initialPath: String? = null): ClaudeCodeVirtualFile {
            synchronized(openSessions) {
                val projectSessions = openSessions.getOrPut(project) { ConcurrentHashMap() }
                return projectSessions.getOrPut(sessionId) { ClaudeCodeVirtualFile(sessionId, initialPath) }
            }
        }

        fun isSessionOpen(project: Project, sessionId: String): Boolean {
            synchronized(openSessions) {
                return openSessions[project]?.containsKey(sessionId) == true
            }
        }

        fun removeSession(project: Project, sessionId: String) {
            synchronized(openSessions) {
                openSessions[project]?.remove(sessionId)
            }
        }
    }

    fun setDisplayName(name: String) {
        val truncated = if (name.length > MAX_DISPLAY_NAME_LENGTH) {
            name.take(MAX_DISPLAY_NAME_LENGTH) + "…"
        } else {
            name
        }
        if (displayName == truncated) return
        val oldName = displayName
        displayName = truncated
        // VirtualFile 변경 알림
        VirtualFileManager.getInstance().notifyPropertyChanged(this, PROP_NAME, oldName, truncated)
    }

    override fun getName(): String = displayName
    override fun getPresentableName(): String = displayName

    override fun isWritable(): Boolean = false
    override fun isValid(): Boolean = true

    override fun equals(other: Any?): Boolean {
        if (other !is ClaudeCodeVirtualFile) return false
        return sessionId == other.sessionId
    }

    override fun hashCode(): Int = sessionId.hashCode()
}

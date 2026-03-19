package com.github.yhk1038.claudecodegui.editor

import com.github.yhk1038.claudecodegui.services.ClaudeCodeBrowserService
import com.github.yhk1038.claudecodegui.services.EditorTabStateService
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.vfs.VirtualFile

/**
 * Listens for actual file close events to clean up session state.
 *
 * JetBrains calls FileEditor.dispose() both when a tab is closed AND when
 * a tab is moved/split between editor groups. This listener ensures that
 * session cleanup (removeSession, removeTab, browser release) only happens
 * on real tab close, not on tab move/split.
 */
class ClaudeCodeEditorManagerListener : FileEditorManagerListener {

    override fun fileClosed(source: FileEditorManager, file: VirtualFile) {
        if (file !is ClaudeCodeVirtualFile) return

        val project = source.project
        ClaudeCodeVirtualFile.removeSession(project, file.sessionId)
        EditorTabStateService.getInstance(project).removeTab(file.sessionId)
        ClaudeCodeBrowserService.getInstance(project).release(file.sessionId)
    }
}

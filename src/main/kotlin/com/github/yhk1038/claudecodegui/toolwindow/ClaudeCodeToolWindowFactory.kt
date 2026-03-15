package com.github.yhk1038.claudecodegui.toolwindow

import com.github.yhk1038.claudecodegui.editor.ClaudeCodeVirtualFile
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.DumbService
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.openapi.wm.ex.ToolWindowManagerListener
import com.intellij.ui.content.ContentFactory
import java.util.UUID
import javax.swing.JLabel
import javax.swing.JPanel
import javax.swing.SwingConstants
import java.awt.BorderLayout

class ClaudeCodeToolWindowFactory : ToolWindowFactory, DumbAware {

    private val logger = Logger.getInstance(ClaudeCodeToolWindowFactory::class.java)

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        // 빈 패널 추가 (Tool Window 구조상 필요)
        val label = JLabel("Loading...", SwingConstants.CENTER)
        val panel = JPanel(BorderLayout())
        panel.add(label, BorderLayout.CENTER)
        val content = ContentFactory.getInstance().createContent(panel, "", false)
        toolWindow.contentManager.addContent(content)

        // Tool Window가 활성화될 때마다 에디터 탭 열기/포커스
        val connection = project.messageBus.connect(toolWindow.disposable)
        connection.subscribe(ToolWindowManagerListener.TOPIC, object : ToolWindowManagerListener {
            override fun stateChanged(toolWindowManager: ToolWindowManager) {
                val tw = toolWindowManager.getToolWindow("Claude Code")
                if (tw != null && tw.isVisible) {
                    ApplicationManager.getApplication().invokeLater {
                        focusOrOpenClaudeCodeTab(project)
                        tw.hide()
                    }
                }
            }
        })

        // 에디터 탭 열기 — 즉시 시도하고, NPE 발생 시 인덱싱 완료 후 재시도
        ApplicationManager.getApplication().invokeLater {
            try {
                focusOrOpenClaudeCodeTab(project)
                toolWindow.hide()
            } catch (e: Exception) {
                logger.info("Editor not ready yet, will retry after indexing", e)
                label.text = "Waiting for project initialization..."
                DumbService.getInstance(project).runWhenSmart {
                    ApplicationManager.getApplication().invokeLater {
                        focusOrOpenClaudeCodeTab(project)
                        toolWindow.hide()
                    }
                }
            }
        }
    }

    private fun focusOrOpenClaudeCodeTab(project: Project) {
        val fileEditorManager = FileEditorManager.getInstance(project)

        // 이미 열린 Claude Code 탭 찾기
        val openClaudeFiles = fileEditorManager.openFiles.filterIsInstance<ClaudeCodeVirtualFile>()

        if (openClaudeFiles.isNotEmpty()) {
            // 마지막으로 선택된 Claude Code 탭으로 포커스
            val lastSelected = fileEditorManager.selectedFiles
                .filterIsInstance<ClaudeCodeVirtualFile>()
                .firstOrNull()

            val fileToFocus = lastSelected ?: openClaudeFiles.last()
            try {
                fileEditorManager.openFile(fileToFocus, true)
            } catch (e: Exception) {
                logger.warn("Failed to open Claude Code tab, retrying in 500ms", e)
                retryOpenFile(project, fileToFocus)
            }
        } else {
            // 열린 탭이 없으면 새 세션 열기
            val newFile = ClaudeCodeVirtualFile.getOrCreate(project, UUID.randomUUID().toString())
            try {
                fileEditorManager.openFile(newFile, true)
            } catch (e: Exception) {
                logger.warn("Failed to open new Claude Code tab, retrying in 500ms", e)
                retryOpenFile(project, newFile)
            }
        }
    }

    private fun retryOpenFile(project: Project, file: ClaudeCodeVirtualFile) {
        java.util.Timer().schedule(object : java.util.TimerTask() {
            override fun run() {
                ApplicationManager.getApplication().invokeLater {
                    try {
                        FileEditorManager.getInstance(project).openFile(file, true)
                    } catch (e: Exception) {
                        logger.warn("Retry also failed to open Claude Code tab", e)
                    }
                }
            }
        }, 500L)
    }

    override fun shouldBeAvailable(project: Project): Boolean = true
}

package com.github.yhk1038.claudecodegui.settings

import com.intellij.openapi.options.Configurable
import com.intellij.openapi.ui.DialogPanel
import com.intellij.ui.dsl.builder.*
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import javax.swing.JComponent

class ClaudeCodeSettingsConfigurable : Configurable {

    private var panel: DialogPanel? = null
    private val settings = SettingsManager.getInstance()

    // UI 바인딩용 임시 변수
    private var cliPath: String = ""
    private var permissionMode: String = "ALWAYS_ASK"
    private var autoApplyLowRisk: Boolean = false

    override fun getDisplayName(): String = "Claude Code"

    override fun createComponent(): JComponent {
        // 현재 설정값 로드
        val currentCliPath = settings.get("cliPath")?.jsonPrimitive?.contentOrNull ?: ""
        val currentPermission = settings.get("permissionMode")?.jsonPrimitive?.contentOrNull ?: "ALWAYS_ASK"
        val currentAutoApply = settings.get("autoApplyLowRisk")?.jsonPrimitive?.booleanOrNull ?: false

        cliPath = currentCliPath
        permissionMode = currentPermission
        autoApplyLowRisk = currentAutoApply

        panel = panel {
            group("CLI Configuration") {
                row("CLI Path:") {
                    textField()
                        .bindText(::cliPath)
                        .columns(COLUMNS_LARGE)
                        .comment("Path to Claude Code CLI. Leave empty for auto-detection.")
                }
            }

            group("Permissions") {
                row("Permission Mode:") {
                    // 의도적으로 WebView의 PermissionMode enum 값과 통일
                    // 기존: "REMEMBER_SESSION", "TRUST_WORKSPACE" (WebView와 불일치)
                    // 변경: "AUTO_APPROVE_SAFE", "AUTO_APPROVE_ALL" (WebView와 일치)
                    comboBox(listOf("ALWAYS_ASK", "AUTO_APPROVE_SAFE", "AUTO_APPROVE_ALL"))
                        .bindItem(::permissionMode.toNullableProperty())
                }
                row {
                    checkBox("Auto-apply low-risk changes")
                        .bindSelected(::autoApplyLowRisk)
                }
            }
        }
        return panel!!
    }

    override fun isModified(): Boolean = panel?.isModified() ?: false

    override fun apply() {
        panel?.apply()
        settings.setAll(mapOf(
            "cliPath" to if (cliPath.isBlank()) JsonNull else JsonPrimitive(cliPath),
            "permissionMode" to JsonPrimitive(permissionMode),
            "autoApplyLowRisk" to JsonPrimitive(autoApplyLowRisk)
        ))
    }

    override fun reset() {
        cliPath = settings.get("cliPath")?.jsonPrimitive?.contentOrNull ?: ""
        permissionMode = settings.get("permissionMode")?.jsonPrimitive?.contentOrNull ?: "ALWAYS_ASK"
        autoApplyLowRisk = settings.get("autoApplyLowRisk")?.jsonPrimitive?.booleanOrNull ?: false
        panel?.reset()
    }
}

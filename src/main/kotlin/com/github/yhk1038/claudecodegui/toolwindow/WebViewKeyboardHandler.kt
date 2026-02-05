package com.github.yhk1038.claudecodegui.toolwindow

import org.cef.browser.CefBrowser
import org.cef.handler.CefKeyboardHandler
import org.cef.handler.CefKeyboardHandlerAdapter
import org.cef.misc.BoolRef
import java.awt.event.KeyEvent

/**
 * WebView 키보드 핸들러
 *
 * macOS에서 Cmd+Arrow, Option+Arrow 키 조합이 IDE에 의해 가로채지지 않도록
 * is_keyboard_shortcut을 false로 설정하여 WebView로 키 이벤트를 전달합니다.
 *
 * 주의: 이 핸들러는 macOS에서만 등록되어야 합니다. (ClaudeCodePanel에서 플랫폼 체크)
 */
class WebViewKeyboardHandler : CefKeyboardHandlerAdapter() {

    companion object {
        // CEF modifier flags (하드코딩된 정수값 - CEF API 경로 의존성 회피)
        private const val EVENTFLAG_COMMAND_DOWN = 128  // META/Command key on macOS
        private const val EVENTFLAG_ALT_DOWN = 16       // Option key on macOS

        // Arrow key codes (AWT KeyEvent 상수 사용)
        private val ARROW_KEYS = setOf(
            KeyEvent.VK_LEFT,   // 37
            KeyEvent.VK_RIGHT,  // 39
            KeyEvent.VK_UP,     // 38
            KeyEvent.VK_DOWN    // 40
        )
    }

    override fun onPreKeyEvent(
        browser: CefBrowser?,
        event: CefKeyboardHandler.CefKeyEvent?,
        is_keyboard_shortcut: BoolRef?
    ): Boolean {
        if (event == null || is_keyboard_shortcut == null) {
            return false
        }

        val keyCode = event.windows_key_code
        val modifiers = event.modifiers

        // Check if it's a text navigation shortcut (Cmd+Arrow or Option+Arrow)
        val isMetaDown = (modifiers and EVENTFLAG_COMMAND_DOWN) != 0
        val isAltDown = (modifiers and EVENTFLAG_ALT_DOWN) != 0
        val isArrowKey = keyCode in ARROW_KEYS

        if (isArrowKey && (isMetaDown || isAltDown)) {
            // Prevent IDE from treating this as a shortcut
            // This allows the key event to pass through to the WebView
            is_keyboard_shortcut.set(false)
        }

        // Return false to allow normal processing
        return false
    }

    override fun onKeyEvent(
        browser: CefBrowser?,
        event: CefKeyboardHandler.CefKeyEvent?
    ): Boolean {
        // Let the browser handle the key event normally
        return false
    }
}

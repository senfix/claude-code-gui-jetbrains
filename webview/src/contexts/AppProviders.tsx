import { ReactNode, useEffect, useRef } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { BridgeProvider, useBridgeContext } from './BridgeContext';
import { ApiProvider, useApiContext } from './ApiContext';
import { SessionProvider, useSessionContext } from './SessionContext';
import { ChatStreamProvider, useChatStreamContext } from './ChatStreamContext';
import { ThemeProvider } from './ThemeContext';
import { SettingsProvider } from './SettingsContext';
import { ClaudeSettingsProvider } from './ClaudeSettingsContext';
import { ChatInputFocusProvider } from './ChatInputFocusContext';
import { WorkingDirProvider } from './WorkingDirContext';
import { CommandPaletteProvider } from '../commandPalette/CommandPaletteProvider';
import type { LoadedMessageDto } from '../types';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * SessionLoader - loadSessions를 bridge 연결 시점에 호출
 *
 * currentSessionId is derived from URL (SSOT) in SessionContext.
 * This component only handles:
 * 1. Loading sessions on connect
 * 2. Restoring session from URL on initial load
 * 3. Subscribing to SESSION_LOADED events
 */
function SessionLoader({ children }: { children: ReactNode }) {
  const { isConnected } = useApiContext();
  const { subscribe } = useBridgeContext();
  const { loadSessions, switchSession, sessions, currentSessionId, navigateToNewSession } = useSessionContext();
  const { loadMessages } = useChatStreamContext();
  const sessionRestored = useRef(false);

  useEffect(() => {
    if (isConnected) {
      console.log('[AppProviders] Bridge connected, loading sessions...');
      loadSessions();
    }
  }, [isConnected, loadSessions]);

  // URL에 sessionId가 있으면 세션 목록 로드 후 해당 세션의 메시지를 로드
  // currentSessionId is already derived from URL — just need to load messages
  useEffect(() => {
    if (sessionRestored.current || !currentSessionId || sessions.length === 0) return;

    sessionRestored.current = true;
    const sessionExists = sessions.some(s => s.id === currentSessionId);
    if (sessionExists) {
      console.log('[AppProviders] Restoring session from URL:', currentSessionId);
      switchSession(currentSessionId);
    } else {
      console.warn('[AppProviders] Session from URL not found, falling back to new session:', currentSessionId);
      navigateToNewSession();
    }
  }, [currentSessionId, sessions, switchSession, navigateToNewSession]);

  // Subscribe to SESSION_LOADED to load messages into chat
  // Raw JSONL entries are passed through - transformation is handled by useChatStream.loadMessages()
  useEffect(() => {
    return subscribe('SESSION_LOADED', (message) => {
      if (message.payload?.messages) {
        const rawMessages = message.payload.messages as LoadedMessageDto[];
        console.log('[AppProviders] Session loaded, injecting raw messages:', rawMessages.length, rawMessages);
        loadMessages(rawMessages);
      }
    });
  }, [subscribe, loadMessages]);

  return <>{children}</>;
}

/**
 * Combined provider wrapper for the entire application.
 *
 * Hierarchy:
 * 1. BridgeProvider - Kotlin IPC bridge (foundation)
 * 2. BrowserRouter - react-router path-based routing
 * 3. ApiProvider - ClaudeCodeApi initialization (depends on Bridge)
 * 4. WorkingDirProvider - Working directory management (depends on Bridge + Api)
 * 5. SettingsProvider - IDE settings (terminal, theme, etc.) (depends on Bridge)
 * 6. ClaudeSettingsProvider - Claude Code settings (~/.claude/settings.json) (depends on Bridge)
 * 7. SessionProvider - Session management (depends on Bridge + WorkingDir + Settings)
 * 8. ChatStreamProvider - Chat state + Streaming + Diffs + Tools (depends on Bridge + Session)
 * 9. CommandPaletteProvider - Slash command manager (depends on ChatStream + Session)
 * 10. ThemeProvider - Theme management (depends on Settings)
 * 11. SessionLoader - Auto-load sessions when bridge connects
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BridgeProvider>
      <BrowserRouter>
        <ApiProvider>
          <WorkingDirProvider>
            <SettingsProvider>
              <ClaudeSettingsProvider>
                <SessionProvider>
                  <ChatStreamProvider>
                    <CommandPaletteProvider>
                      <ThemeProvider>
                        <ChatInputFocusProvider>
                          <SessionLoader>{children}</SessionLoader>
                        </ChatInputFocusProvider>
                      </ThemeProvider>
                    </CommandPaletteProvider>
                  </ChatStreamProvider>
                </SessionProvider>
              </ClaudeSettingsProvider>
            </SettingsProvider>
          </WorkingDirProvider>
        </ApiProvider>
      </BrowserRouter>
    </BridgeProvider>
  );
}

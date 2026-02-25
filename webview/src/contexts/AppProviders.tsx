import { ReactNode, useEffect } from 'react';
import { BridgeProvider, useBridgeContext } from './BridgeContext';
import { ApiProvider, useApiContext } from './ApiContext';
import { SessionProvider, useSessionContext } from './SessionContext';
import { ChatStreamProvider, useChatStreamContext } from './ChatStreamContext';
import { ThemeProvider } from './ThemeContext';
import { Router } from '../router';
import { SettingsProvider } from './SettingsContext';
import { ChatInputFocusProvider } from './ChatInputFocusContext';
import { CommandPaletteProvider } from '../commandPalette/CommandPaletteProvider';
import type { LoadedMessageDto } from '../types';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * SessionLoader - loadSessions를 bridge 연결 시점에 호출
 */
function SessionLoader({ children }: { children: ReactNode }) {
  const { isConnected } = useApiContext();
  const { subscribe } = useBridgeContext();
  const { loadSessions } = useSessionContext();
  const { loadMessages } = useChatStreamContext();

  useEffect(() => {
    if (isConnected) {
      console.log('[AppProviders] Bridge connected, loading sessions...');
      loadSessions();
    }
  }, [isConnected, loadSessions]);

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
 * 2. ApiProvider - ClaudeCodeApi initialization (depends on Bridge)
 * 3. SessionProvider - Session management (depends on Bridge)
 * 4. ChatStreamProvider - Chat state + Streaming + Diffs + Tools (depends on Bridge + Session)
 * 5. CommandPaletteProvider - 슬래시 커맨드 매니저 (depends on ChatStream + Session)
 * 6. ThemeProvider - Theme management (independent)
 * 7. SessionLoader - Auto-load sessions when bridge connects
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <BridgeProvider>
      <Router>
        <ApiProvider>
          <SessionProvider>
            <ChatStreamProvider>
              <CommandPaletteProvider>
                <SettingsProvider>
                <ThemeProvider>
                  <ChatInputFocusProvider>
                    <SessionLoader>{children}</SessionLoader>
                  </ChatInputFocusProvider>
                </ThemeProvider>
                </SettingsProvider>
              </CommandPaletteProvider>
            </ChatStreamProvider>
          </SessionProvider>
        </ApiProvider>
      </Router>
    </BridgeProvider>
  );
}

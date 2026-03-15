import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SessionState } from '../types';
import { SessionMetaDto } from '../dto';
import { useBridgeContext } from './BridgeContext';
import { useApi } from './ApiContext';
import { useWorkingDir } from './WorkingDirContext';
import { useClaudeSettings } from './ClaudeSettingsContext';
import { getAdapter, onBridgeReady } from '../adapters';
import { getLogForwarder } from '../api/logging';
import { toTitle } from '../mappers/sessionTransformer';
import { Route, routeToPath, sessionToPath, parseSessionIdFromPath, withWorkingDir } from '../router/routes';
import { InputMode, getAvailableModes } from '../types/chatInput';


interface SessionContextValue {
  // State (currentSessionId is derived from URL — single source of truth)
  currentSessionId: string | null;
  currentSession: SessionMetaDto | null;
  sessions: SessionMetaDto[];
  sessionState: SessionState;
  isLoading: boolean;
  workingDirectory: string | null;

  // Input mode
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  cycleInputMode: () => void;
  /** 설정값에서 로드된 초기 모드를 동기화 (사용자가 직접 변경하지 않은 경우에만 적용) */
  syncInitialInputMode: (initialMode: InputMode) => void;
  /** 세션 전환 시 초기 모드 재동기화를 트리거하기 위한 카운터 */
  modeResetTrigger: number;

  // Actions
  navigateToSession: (sessionId: string) => void;
  navigateToNewSession: () => void;
  loadSessions: () => Promise<void>;
  resetToNewSession: () => void;
  openNewTab: () => void;
  openSettings: () => void;
  switchSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, title: string) => void;
  addNewSession: (sessionId: string, firstPrompt: string) => void;
  setSessionState: (state: SessionState) => void;
  setWorkingDirectory: (dir: string | null) => void;
  registerBeforeSwitch: (cb: () => void) => void;
  /** Returns true if the session was just created locally (not restored from URL) */
  isNewlyCreatedSession: (sessionId: string) => boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const { subscribe, send, isConnected } = useBridgeContext();
  const { workingDirectory, setWorkingDirectory } = useWorkingDir();
  const { settings: claudeSettings } = useClaudeSettings();
  const api = useApi();
  const navigate = useNavigate();
  const location = useLocation();

  const bypassDisabled = claudeSettings.permissions?.disableBypassPermissionsMode === 'disable';

  // currentSessionId is derived from URL (SSOT)
  const currentSessionId = parseSessionIdFromPath(location.pathname);

  const [sessions, setSessions] = useState<SessionMetaDto[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.Idle);
  const [isLoading, setIsLoading] = useState(false);
  // 세션 전환 전 호출되는 콜백 (ChatStreamContext가 등록)
  const beforeSwitchRef = useRef<(() => void) | null>(null);
  const newlyCreatedSessionIds = useRef(new Set<string>());
  // 재연결 감지용 — 이전 연결 상태 추적 (결함 B+C 수정)
  const prevConnectedRef = useRef(false);
  const registerBeforeSwitch = useCallback((cb: () => void) => {
    beforeSwitchRef.current = cb;
  }, []);

  // Input mode 상태
  const [inputMode, setInputModeState] = useState<InputMode>('ask_before_edit');
  const hasUserChangedMode = useRef(false);
  // 세션 전환 시 초기 모드 재동기화를 트리거하기 위한 카운터
  const [modeResetTrigger, setModeResetTrigger] = useState(0);

  const setInputMode = useCallback((newMode: InputMode) => {
    hasUserChangedMode.current = true;
    setInputModeState(newMode);
  }, []);

  const cycleInputMode = useCallback(() => {
    hasUserChangedMode.current = true;
    setInputModeState((current) => {
      const modes = getAvailableModes(bypassDisabled);
      const currentIndex = modes.indexOf(current);
      const nextIndex = (currentIndex + 1) % modes.length;
      return modes[nextIndex];
    });
  }, [bypassDisabled]);

  const syncInitialInputMode = useCallback((initialMode: InputMode) => {
    if (!hasUserChangedMode.current) {
      setInputModeState(initialMode);
    }
  }, []);

  // JetBrains에서 kotlinBridgeReady 이벤트 후 IDE adapter 재초기화
  useEffect(() => {
    const handleBridgeReady = () => {
      onBridgeReady();
    };

    window.addEventListener('kotlinBridgeReady', handleBridgeReady);
    return () => window.removeEventListener('kotlinBridgeReady', handleBridgeReady);
  }, []);

  // WebSocket 재연결 시 현재 세션 재구독 (결함 B+C 수정)
  // JCEF 탭 전환으로 연결이 끊겼다 복구되면 새 connectionId로 SESSION_CHANGE를 전송해
  // 백엔드가 해당 연결을 올바른 세션에 구독시키도록 한다.
  useEffect(() => {
    if (isConnected && !prevConnectedRef.current && currentSessionId) {
      send('SESSION_CHANGE', { sessionId: currentSessionId }).catch((error: unknown) => {
        console.error('[SessionContext] Failed to resubscribe session on reconnect:', error);
      });
      console.log('[SessionContext] Resubscribed to session on reconnect:', currentSessionId);
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected, currentSessionId, send]);

  // Navigation helpers
  const navigateToSession = useCallback((sessionId: string) => {
    navigate(withWorkingDir(sessionToPath(sessionId)), { replace: true });
  }, [navigate]);

  const navigateToNewSession = useCallback(() => {
    navigate(withWorkingDir(routeToPath(Route.NEW_SESSION)), { replace: true });
  }, [navigate]);

  // loadSessions - using new API
  const loadSessions = useCallback(async () => {
    if (!isConnected) {
      console.log('[SessionContext] Not connected, cannot load sessions');
      return;
    }

    if (!workingDirectory) {
      console.log('[SessionContext] No working directory set, cannot load sessions');
      return;
    }

    try {
      setIsLoading(true);
      console.log('[SessionContext] Loading sessions from:', workingDirectory);

      const sessions = await api.sessions.index().then((sessions) => {
        return sessions
          .filter(s => !s.isSidechain)
          .sort((a, b) => {
            const aTime = a.updatedAt?.getTime() ?? 0;
            const bTime = b.updatedAt?.getTime() ?? 0;
            return bTime - aTime;
          });
      });
      setSessions(sessions);
      console.log('[SessionContext] Loaded CLI sessions:', sessions);
    } catch (error) {
      console.error('[SessionContext] Failed to load sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, api.sessions, workingDirectory]);


  // Listen for state changes from Kotlin
  useEffect(() => {
    const unsubscribe = subscribe('STATE_CHANGE', (message) => {
      const state = message.payload?.state as SessionState;
      if (state) {
        setSessionState(state);
      }
    });
    return unsubscribe;
  }, [subscribe]);

  // Subscribe to SESSIONS_UPDATED for cross-tab session list sync
  useEffect(() => {
    const unsubscribe = subscribe('SESSIONS_UPDATED', (message) => {
      const { action, session } = message.payload as { action: string; session: { sessionId: string } };
      if (action === 'upsert' && session?.sessionId) {
        setSessions(prev => {
          const exists = prev.find(s => s.id === session.sessionId);
          if (exists) {
            return prev.map(s =>
              s.id === session.sessionId
                ? { ...s, updatedAt: new Date() }
                : s
            );
          }
          // 다른 탭에서 생성된 세션 — loadSessions로 전체 갱신
          loadSessions();
          return prev;
        });
      } else if (action === 'delete' && session?.sessionId) {
        setSessions(prev => prev.filter(s => s.id !== session.sessionId));
      }
    });
    return unsubscribe;
  }, [subscribe, loadSessions]);

  const resetToNewSession = useCallback(() => {
    beforeSwitchRef.current?.();
    setSessionState(SessionState.Idle);
    hasUserChangedMode.current = false;
    setModeResetTrigger(c => c + 1);

    // URL change is the SSOT — navigating IS the session reset
    navigateToNewSession();

    api.sessions.create().catch(error => {
      console.error('[SessionContext] Failed to clear CLI session:', error);
    });
  }, [api.sessions, navigateToNewSession]);

  const openNewTab = useCallback(() => {
    getAdapter().openNewTab().catch(error => {
      console.error('[SessionContext] Failed to open new tab:', error);
    });
  }, []);

  const openSettings = useCallback(() => {
    getAdapter().openSettings().catch(error => {
      console.error('[SessionContext] Failed to open settings:', error);
    });
  }, []);

  const switchSession = useCallback(async (sessionId: string) => {
    console.log('[SessionContext] switchSession called with:', sessionId);

    if (sessions.some(s => s.id === sessionId)) {
      // 동기적으로 이전 세션 상태를 먼저 리셋 (레이스 컨디션 방지)
      beforeSwitchRef.current?.();

      setSessionState(SessionState.Idle);
      hasUserChangedMode.current = false;
      setModeResetTrigger(c => c + 1);

      // URL change is the SSOT — navigating IS the session switch
      navigateToSession(sessionId);

      try {
        await api.sessions.load(sessionId);
        console.log('[SessionContext] Session load requested:', sessionId);
      } catch (error) {
        console.error('[SessionContext] Failed to load session:', error);
      }
    } else {
      console.warn('[SessionContext] Session not found in list:', sessionId);
    }
  }, [sessions, api.sessions, navigateToSession]);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await api.sessions.destroy(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setSessionState(SessionState.Idle);
        navigateToNewSession();
      }
    } catch (error) {
      console.error('[SessionContext] Failed to delete session:', error);
    }
  }, [currentSessionId, api.sessions, navigateToNewSession]);

  const renameSession = useCallback((sessionId: string, title: string) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, title, updatedAt: new Date() }
        : s
    ));
  }, []);

  const addNewSession = useCallback((sessionId: string, firstPrompt: string) => {
    const now = new Date();
    const newSession = Object.assign(new SessionMetaDto(), {
      id: sessionId,
      title: toTitle(firstPrompt),
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
      isSidechain: false,
    });
    newlyCreatedSessionIds.current.add(sessionId);
    setSessions(prev => [newSession, ...prev]);

    // URL change is the SSOT — navigating IS the session creation
    navigateToSession(sessionId);
  }, [navigateToSession]);

  const isNewlyCreatedSession = useCallback((sessionId: string) => {
    return newlyCreatedSessionIds.current.has(sessionId);
  }, []);

  // LogForwarder에 현재 세션 ID 동기화
  useEffect(() => {
    getLogForwarder()?.setSessionId(currentSessionId);
  }, [currentSessionId]);

  const currentSession = useMemo(() => {
    return sessions.find(s => s.id === currentSessionId) ?? null;
  }, [sessions, currentSessionId]);

  const value: SessionContextValue = {
    currentSessionId,
    currentSession,
    sessions,
    sessionState,
    isLoading,
    workingDirectory,
    inputMode,
    setInputMode,
    cycleInputMode,
    syncInitialInputMode,
    modeResetTrigger,
    navigateToSession,
    navigateToNewSession,
    loadSessions,
    resetToNewSession,
    openNewTab,
    openSettings,
    switchSession,
    deleteSession,
    renameSession,
    addNewSession,
    setSessionState,
    setWorkingDirectory,
    registerBeforeSwitch,
    isNewlyCreatedSession,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  return context;
}

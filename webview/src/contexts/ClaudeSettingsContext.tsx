import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { ClaudeSettingsState, DEFAULT_CLAUDE_SETTINGS } from '@/types/claude-settings';
import { useBridge } from '@/hooks/useBridge';
import { useWorkingDir } from '@/contexts/WorkingDirContext';

interface ClaudeSettingsContextValue {
  settings: ClaudeSettingsState;
  scopeSettings: Partial<ClaudeSettingsState>;
  isLoading: boolean;
  overrides: string[];
  scope: 'global' | 'project';
  setScope: (scope: 'global' | 'project') => void;
  updateSetting: <K extends keyof ClaudeSettingsState>(key: K, value: ClaudeSettingsState[K]) => Promise<void>;
  updateSettingWithScope: <K extends keyof ClaudeSettingsState>(key: K, value: ClaudeSettingsState[K], targetScope: 'global' | 'project') => Promise<void>;
  resetToGlobal: <K extends keyof ClaudeSettingsState>(key: K) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const ClaudeSettingsContext = createContext<ClaudeSettingsContextValue | null>(null);

interface ClaudeSettingsProviderProps {
  children: ReactNode;
}

export function ClaudeSettingsProvider({ children }: ClaudeSettingsProviderProps) {
  const [settings, setSettings] = useState<ClaudeSettingsState>(DEFAULT_CLAUDE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [overrides, setOverrides] = useState<string[]>([]);
  const [scopeSettings, setScopeSettings] = useState<Partial<ClaudeSettingsState>>({});
  const [scope, setScope] = useState<'global' | 'project'>('global');
  const { isConnected, send, subscribe } = useBridge();
  const { workingDirectory } = useWorkingDir();

  // Load settings from bridge
  const loadFromBridge = useCallback(async (): Promise<boolean> => {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await send('GET_CLAUDE_SETTINGS', { workingDir: workingDirectory });
        if (response?.settings) {
          setSettings(response.settings as ClaudeSettingsState);
          if (response?.overrides) {
            setOverrides(response.overrides as string[]);
          }
          return true;
        }
      } catch (error) {
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        } else {
          console.warn('[ClaudeSettingsContext] Failed to load settings from bridge after retries');
        }
      }
    }
    return false;
  }, [send, workingDirectory]);

  // Load scope-specific (raw) settings for settings page display
  const loadScopeSettings = useCallback(async (targetScope: 'global' | 'project') => {
    try {
      const response = await send('GET_CLAUDE_SETTINGS', {
        workingDir: workingDirectory,
        scope: targetScope,
      });
      if (response?.settings) {
        setScopeSettings(response.settings as Partial<ClaudeSettingsState>);
      }
    } catch (error) {
      console.warn('[ClaudeSettingsContext] Failed to load scope settings:', error);
    }
  }, [send, workingDirectory]);

  // Initial load on mount
  useEffect(() => {
    loadFromBridge().finally(() => setIsLoading(false));
  }, [loadFromBridge]);

  // Reload scope-specific settings when scope changes or connection established
  useEffect(() => {
    if (isConnected) {
      loadScopeSettings(scope);
    }
  }, [isConnected, scope, loadScopeSettings]);

  // Listen for external changes from backend
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe('CLAUDE_SETTINGS_CHANGED', (message) => {
      const payload = message.payload as Record<string, unknown>;
      const newSettings = payload?.settings as ClaudeSettingsState | undefined;
      const newOverrides = payload?.overrides as string[] | undefined;
      if (newSettings) {
        console.log('[ClaudeSettingsContext] Settings changed externally:', newSettings);
        setSettings(newSettings);
      }
      if (newOverrides) setOverrides(newOverrides);
      loadScopeSettings(scope);
    });

    return unsubscribe;
  }, [isConnected, subscribe, scope, loadScopeSettings]);

  // Update individual setting using current scope
  const updateSetting = useCallback(
    async <K extends keyof ClaudeSettingsState>(key: K, value: ClaudeSettingsState[K]) => {
      const previousSettings = settings;
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings); // optimistic update

      try {
        if (!isConnected) {
          throw new Error('Bridge not connected');
        }
        const response = await send('SAVE_CLAUDE_SETTINGS', { key, value, scope, workingDir: workingDirectory });
        if (response?.status === 'error') {
          throw new Error(response.error || 'Save failed');
        }
        loadScopeSettings(scope);
        return;
      } catch (error) {
        console.warn('[ClaudeSettingsContext] Failed to save setting:', error);
        setSettings(previousSettings);
        throw error;
      }
    },
    [settings, isConnected, send, scope, workingDirectory, loadScopeSettings],
  );

  // Update individual setting with explicit scope
  const updateSettingWithScope = useCallback(
    async <K extends keyof ClaudeSettingsState>(key: K, value: ClaudeSettingsState[K], targetScope: 'global' | 'project') => {
      const previousSettings = settings;
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      try {
        if (!isConnected) throw new Error('Not connected');
        const response = await send('SAVE_CLAUDE_SETTINGS', { key, value, scope: targetScope, workingDir: workingDirectory });
        if (response?.status === 'error') throw new Error(response.error || 'Save failed');
      } catch (error) {
        console.warn('[ClaudeSettingsContext] Failed to save setting with scope:', error);
        setSettings(previousSettings);
      }
    },
    [settings, isConnected, send, workingDirectory],
  );

  // Remove a project override, reverting to global value
  const resetToGlobal = useCallback(async <K extends keyof ClaudeSettingsState>(key: K) => {
    if (!isConnected || !workingDirectory) return;
    try {
      await send('SAVE_CLAUDE_SETTINGS', { key, value: null, scope: 'project', workingDir: workingDirectory });
      await loadFromBridge();
      await loadScopeSettings(scope);
    } catch (error) {
      console.warn('[ClaudeSettingsContext] Failed to reset setting to global:', error);
    }
  }, [isConnected, send, workingDirectory, loadFromBridge, scope, loadScopeSettings]);

  // Refresh settings
  const refreshSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadFromBridge();
    } finally {
      setIsLoading(false);
    }
  }, [loadFromBridge]);

  return (
    <ClaudeSettingsContext.Provider value={{
      settings,
      scopeSettings,
      isLoading,
      overrides,
      scope,
      setScope,
      updateSetting,
      updateSettingWithScope,
      resetToGlobal,
      refreshSettings,
    }}>
      {children}
    </ClaudeSettingsContext.Provider>
  );
}

export function useClaudeSettings(): ClaudeSettingsContextValue {
  const context = useContext(ClaudeSettingsContext);
  if (!context) {
    throw new Error('useClaudeSettings must be used within a ClaudeSettingsProvider');
  }
  return context;
}

export { ClaudeSettingsContext };

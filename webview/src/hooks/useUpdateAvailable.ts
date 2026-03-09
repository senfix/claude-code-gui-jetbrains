import { useState, useMemo, useCallback } from 'react';
import { usePluginUpdates } from './usePluginUpdates';
import { useVersionInfo } from './useVersionInfo';

const SKIPPED_VERSION_KEY = 'claude-code-gui:skipped-version';

function getSkippedVersion(): string | null {
  try {
    return localStorage.getItem(SKIPPED_VERSION_KEY);
  } catch {
    return null;
  }
}

function persistSkippedVersion(version: string): void {
  try {
    localStorage.setItem(SKIPPED_VERSION_KEY, version);
  } catch {
    // ignore
  }
}

interface UseUpdateAvailableReturn {
  hasUpdate: boolean;
  latestVersion: string | null;
  latestNotes: string | null;
  currentVersion: string;
  requiresRestart: boolean;
  skip: () => void;
}

export function useUpdateAvailable(): UseUpdateAvailableReturn {
  const { updates } = usePluginUpdates();
  const { pluginVersion, requiresRestart } = useVersionInfo();
  const [skippedVersion, setSkippedVersion] = useState(getSkippedVersion);

  const latestUpdate = updates[0] ?? null;

  const hasUpdate = useMemo(() => {
    if (!latestUpdate) return false;
    if (latestUpdate.version === pluginVersion) return false;
    if (latestUpdate.version === skippedVersion) return false;
    return true;
  }, [latestUpdate, pluginVersion, skippedVersion]);

  const skip = useCallback(() => {
    if (latestUpdate) {
      persistSkippedVersion(latestUpdate.version);
      setSkippedVersion(latestUpdate.version);
    }
  }, [latestUpdate]);

  return {
    hasUpdate,
    latestVersion: latestUpdate?.version ?? null,
    latestNotes: latestUpdate?.notes ?? null,
    currentVersion: pluginVersion,
    requiresRestart,
    skip,
  };
}

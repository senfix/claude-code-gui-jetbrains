import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useBridgeContext } from '@/contexts/BridgeContext';
import { useApi } from '@/contexts/ApiContext';

interface WorkingDirContextValue {
  workingDirectory: string | null;
  setWorkingDirectory: (dir: string | null) => void;
}

const WorkingDirContext = createContext<WorkingDirContextValue | null>(null);

interface Props {
  children: ReactNode;
}

export function WorkingDirProvider(props: Props) {
  const { children } = props;
  const { isConnected } = useBridgeContext();
  const api = useApi();
  const location = useLocation();

  const [workingDirectory, setWorkingDirectoryState] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('workingDir') || null;
  });

  const setWorkingDirectory = useCallback((dir: string | null) => {
    setWorkingDirectoryState(dir);
    if (dir) {
      api.setWorkingDir(dir);
      const url = new URL(window.location.href);
      url.searchParams.set('workingDir', dir);
      window.history.replaceState({}, '', url.toString());
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete('workingDir');
      window.history.replaceState({}, '', url.toString());
    }
  }, [api]);

  // Initialize API workingDir on mount
  useEffect(() => {
    if (workingDirectory) {
      api.setWorkingDir(workingDirectory);
    }
  }, [api, workingDirectory]);

  // Single-process mode: no default workingDir from backend.
  // If no workingDir in URL params, redirect to project selector.
  useEffect(() => {
    if (!isConnected || workingDirectory || location.pathname === '/') return;

    // No workingDir available — navigate to project selector
    window.location.href = '/';
  }, [isConnected, workingDirectory, location.pathname]);

  const value: WorkingDirContextValue = {
    workingDirectory,
    setWorkingDirectory,
  };

  return (
    <WorkingDirContext.Provider value={value}>
      {children}
    </WorkingDirContext.Provider>
  );
}

export function useWorkingDir(): WorkingDirContextValue {
  const context = useContext(WorkingDirContext);
  if (!context) {
    throw new Error('useWorkingDir must be used within a WorkingDirProvider');
  }
  return context;
}

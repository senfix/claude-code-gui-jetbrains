import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { api, ClaudeCodeApi } from '../api';
import { useBridgeContext } from './BridgeContext';

interface ApiContextValue {
  api: ClaudeCodeApi;
  isConnected: boolean;
}

const ApiContext = createContext<ApiContextValue | null>(null);

interface ApiProviderProps {
  children: ReactNode;
}

/**
 * Provider that initializes the ClaudeCodeApi with the bridge connection
 * Must be nested inside BridgeProvider
 */
export function ApiProvider({ children }: ApiProviderProps) {
  const { send, subscribe, isConnected } = useBridgeContext();
  const [isApiReady, setIsApiReady] = useState(false);
  const initializedRef = useRef(false);

  // Initialize API synchronously on first render when connected
  // This ensures API is ready before children mount
  if (isConnected && !initializedRef.current) {
    api.initialize(send, subscribe, isConnected);
    api.setConnected(isConnected);
    initializedRef.current = true;
  }

  // Handle subsequent connection state changes
  useEffect(() => {
    if (isConnected) {
      api.initialize(send, subscribe, isConnected);
      api.setConnected(isConnected);
      setIsApiReady(true);
    } else {
      api.setConnected(false);
      setIsApiReady(false);
      initializedRef.current = false;
    }
  }, [send, subscribe, isConnected]);

  const value: ApiContextValue = {
    api,
    isConnected,
  };

  // Don't render children until API is initialized
  if (isConnected && !isApiReady && !initializedRef.current) {
    return null;
  }

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
}

/**
 * Hook to access the API context
 */
export function useApiContext(): ApiContextValue {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApiContext must be used within an ApiProvider');
  }
  return context;
}

/**
 * Hook to access the ClaudeCodeApi instance directly
 */
export function useApi(): ClaudeCodeApi {
  const { api } = useApiContext();
  return api;
}

import { useCallback, useEffect, useRef, useState } from 'react';

type MessageHandler = (message: IPCMessage) => void;

interface UseBridgeReturn {
  isConnected: boolean;
  send: (type: string, payload: Record<string, unknown>) => Promise<any>;
  subscribe: (type: string, handler: MessageHandler) => () => void;
  lastError: Error | null;
}

export function useBridge(): UseBridgeReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  const handlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const pendingRef = useRef<Map<string, { resolve: (payload?: any) => void; reject: (e: Error) => void }>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectingRef = useRef(false);

  // Generate unique request ID
  const generateRequestId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Handle incoming messages - use ref to avoid dependency issues
  const handleMessageRef = useRef<(message: IPCMessage) => void>();
  handleMessageRef.current = (message: IPCMessage) => {
    console.log('[useBridge] Received message:', message.type, message);

    // Handle acknowledgments for pending requests
    // Check both message.requestId (Kotlin) and message.payload.requestId (legacy)
    if (message.type === 'ACK') {
      const requestId = (message.requestId || message.payload?.requestId) as string;
      if (requestId) {
        const pending = pendingRef.current.get(requestId);
        if (pending) {
          pendingRef.current.delete(requestId);
          pending.resolve(message.payload);
        }
      }
      return;
    }

    // Handle errors for pending requests
    if (message.type === 'ERROR' && message.requestId) {
      const pending = pendingRef.current.get(message.requestId);
      if (pending) {
        pendingRef.current.delete(message.requestId);
        pending.reject(new Error(String(message.payload?.error || 'Unknown error')));
      }
      return;
    }

    // Dispatch to subscribers
    const handlers = handlersRef.current.get(message.type);
    if (handlers) {
      console.debug('[useBridge] dispatch:', message.type, '→', handlers.size, 'handlers');
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('[useBridge] Error in message handler:', error);
        }
      });
    }
  };

  // Connect: production uses Kotlin bridge, development uses WebSocket
  useEffect(() => {
    // === PRODUCTION: Kotlin bridge only ===
    if (import.meta.env.PROD) {
      const setupKotlinBridge = () => {
        console.log('[useBridge] Setting up Kotlin bridge');
        setIsConnected(true);
        window.dispatchKotlinMessage = (msg: IPCMessage) => handleMessageRef.current?.(msg);
      };

      // Already available
      if (window.kotlinBridge) {
        setupKotlinBridge();
      }

      // Wait for injection after page load
      const handleBridgeReady = () => {
        console.log('[useBridge] Received kotlinBridgeReady event');
        if (window.kotlinBridge) {
          setupKotlinBridge();
        }
      };
      window.addEventListener('kotlinBridgeReady', handleBridgeReady);

      return () => {
        window.removeEventListener('kotlinBridgeReady', handleBridgeReady);
        window.dispatchKotlinMessage = undefined;
      };
    }

    // === DEVELOPMENT: WebSocket to Vite dev server ===
    console.log('[useBridge] Dev mode: connecting to WebSocket...');

    const connect = () => {
      if (isConnectingRef.current) return;
      isConnectingRef.current = true;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log('[useBridge] Connecting to:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[useBridge] WebSocket connected');
        isConnectingRef.current = false;
        setIsConnected(true);
        setLastError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message: IPCMessage = JSON.parse(event.data);
          handleMessageRef.current?.(message);
        } catch (error) {
          console.error('[useBridge] Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('[useBridge] WebSocket disconnected');
        isConnectingRef.current = false;
        wsRef.current = null;
        setIsConnected(false);

        // Reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[useBridge] Attempting to reconnect...');
          connect();
        }, 2000);
      };

      ws.onerror = (error) => {
        console.error('[useBridge] WebSocket error:', error);
        isConnectingRef.current = false;
        setLastError(new Error('WebSocket connection error'));
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      isConnectingRef.current = false;
      setIsConnected(false);
    };
  }, []);

  // Wait for WebSocket to be ready
  const waitForConnection = useCallback((timeout = 5000): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Already connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          clearInterval(checkInterval);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('WebSocket connection timeout'));
        }
      }, 50);
    });
  }, []);

  // Send message
  const send = useCallback(async <T = any>(type: string, payload: Record<string, unknown> = {}): Promise<T> => {
    const requestId = generateRequestId();
    const message: IPCMessage = {
      type,
      requestId,
      payload,
      timestamp: Date.now(),
    };

    console.log('[useBridge] Sending message:', type, payload);

    // In dev mode, wait for WebSocket if not ready
    if (import.meta.env.DEV && wsRef.current?.readyState !== WebSocket.OPEN) {
      console.log('[useBridge] Waiting for WebSocket connection...');
      try {
        await waitForConnection();
      } catch (error) {
        console.error('[useBridge] Connection wait failed:', error);
        throw new Error('No bridge available');
      }
    }

    return new Promise((resolve, reject) => {
      pendingRef.current.set(requestId, { resolve, reject });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingRef.current.has(requestId)) {
          pendingRef.current.delete(requestId);
          const error = new Error(`Request ${requestId} (${type}) timed out`);
          console.error('[useBridge] Request timeout:', requestId, type);
          reject(error);
        }
      }, 30000);

      try {
        if (import.meta.env.PROD && window.kotlinBridge?.send) {
          window.kotlinBridge.send(message);
        } else if (import.meta.env.DEV && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify(message));
          console.log('[useBridge] Message sent via WebSocket');
        } else {
          throw new Error('No bridge available');
        }
      } catch (error) {
        pendingRef.current.delete(requestId);
        const err = error instanceof Error ? error : new Error(String(error));
        setLastError(err);
        console.error('[useBridge] Error sending message:', error);
        reject(error);
      }
    });
  }, [generateRequestId, waitForConnection]);

  // Subscribe to messages of a specific type
  const subscribe = useCallback((type: string, handler: MessageHandler) => {
    console.debug('[useBridge] subscribe:', type);
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    handlersRef.current.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      handlersRef.current.get(type)?.delete(handler);
    };
  }, []);

  return {
    isConnected,
    send,
    subscribe,
    lastError,
  };
}

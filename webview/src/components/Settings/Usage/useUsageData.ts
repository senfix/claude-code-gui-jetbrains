import { useState, useEffect, useCallback } from 'react';
import { useBridgeContext } from '@/contexts/BridgeContext';
import type { UsageResponse } from '@/types/usage';

interface UseUsageDataReturn {
  data: UsageResponse | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

export function useUsageData(): UseUsageDataReturn {
  const { isConnected, send } = useBridgeContext();
  const [data, setData] = useState<UsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchUsage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await send('GET_USAGE', {});
      if (result.status === 'ok' && result.usage) {
        setData(result.usage as UsageResponse);
        setLastUpdated(new Date());
      } else {
        setError(result.error || 'Failed to fetch usage data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [send]);

  useEffect(() => {
    if (isConnected) {
      fetchUsage();
    }
  }, [isConnected, fetchUsage]);

  return { data, isLoading, error, lastUpdated, refresh: fetchUsage };
}

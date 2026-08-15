import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/axios";

// In-memory response cache across component mounts / tab switches
const memoryCache = new Map<string, { data: any; timestamp: number }>();

interface SwrOptions {
  ttlMs?: number; // Cache time-to-live before automatic background revalidation
  enabled?: boolean;
}

/**
 * useSwrCache
 * Stale-While-Revalidate hook for sub-millisecond client UI hydration.
 * Returns cached data immediately if available, then updates silently from backend.
 */
export function useSwrCache<T = any>(
  url: string | null,
  options: SwrOptions = {}
) {
  const { ttlMs = 30000, enabled = true } = options;

  const [data, setData] = useState<T | null>(() => {
    if (!url) return null;
    const cached = memoryCache.get(url);
    return cached ? (cached.data as T) : null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (!url || !enabled) return false;
    return !memoryCache.has(url);
  });

  const [error, setError] = useState<any>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    if (!url || !enabled) return;

    try {
      const res = await api.get(url);
      if (isMountedRef.current) {
        memoryCache.set(url, { data: res.data, timestamp: Date.now() });
        setData(res.data);
        setError(null);
        setLoading(false);
      }
      return res.data;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err);
        setLoading(false);
      }
    }
  }, [url, enabled]);

  useEffect(() => {
    if (!url || !enabled) return;

    const cached = memoryCache.get(url);
    const isStale = !cached || Date.now() - cached.timestamp > ttlMs;

    if (cached) {
      setData(cached.data as T);
      setLoading(false);
    }

    if (isStale) {
      refetch();
    }
  }, [url, enabled, ttlMs, refetch]);

  const mutate = useCallback(
    (newData: T | ((prev: T | null) => T), shouldRevalidate = true) => {
      if (!url) return;
      const nextVal = typeof newData === "function" ? (newData as any)(data) : newData;
      memoryCache.set(url, { data: nextVal, timestamp: Date.now() });
      setData(nextVal);
      if (shouldRevalidate) {
        refetch();
      }
    },
    [url, data, refetch]
  );

  return { data, loading, error, refetch, mutate };
}

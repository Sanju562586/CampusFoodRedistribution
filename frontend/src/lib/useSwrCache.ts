import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/axios";

// ── In-memory response cache (shared across component mounts / tab switches) ──
const memoryCache = new Map<string, { data: any; timestamp: number }>();

// ── In-flight promise deduplication ────────────────────────────────────────
// Multiple components mounting at the same time share ONE network request
// instead of firing duplicate calls for the same URL.
const inflightRequests = new Map<string, Promise<any>>();

// ── sessionStorage persistence helpers ─────────────────────────────────────
// Persist cache entries across page refreshes for key high-value endpoints.
// Silently no-ops if sessionStorage is unavailable (SSR, private mode quirks).
const PERSISTED_URLS = new Set(["/food/available", "/auth/leaderboard"]);
const SS_PREFIX = "swr:";

function readSessionCache(url: string): { data: any; timestamp: number } | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SS_PREFIX + url);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSessionCache(url: string, data: any, timestamp: number) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SS_PREFIX + url, JSON.stringify({ data, timestamp }));
  } catch {
    // Quota exceeded or private mode — fail silently
  }
}

function getCached(url: string): { data: any; timestamp: number } | undefined {
  // L1: in-memory (instant)
  if (memoryCache.has(url)) return memoryCache.get(url);
  // L2: sessionStorage (survives page refresh)
  if (PERSISTED_URLS.has(url)) {
    const ss = readSessionCache(url);
    if (ss) {
      memoryCache.set(url, ss); // warm L1
      return ss;
    }
  }
  return undefined;
}

function setCached(url: string, data: any) {
  const entry = { data, timestamp: Date.now() };
  memoryCache.set(url, entry);
  if (PERSISTED_URLS.has(url)) {
    writeSessionCache(url, data, entry.timestamp);
  }
}

interface SwrOptions {
  ttlMs?: number; // Cache time-to-live before automatic background revalidation
  enabled?: boolean;
}

/**
 * useSwrCache
 * Stale-While-Revalidate hook for sub-millisecond client UI hydration.
 *
 * Features:
 *  - L1 in-memory cache: instant (<1ms) on re-mount / tab switch
 *  - L2 sessionStorage cache: survives page refresh for key endpoints
 *  - In-flight deduplication: concurrent components share ONE network request
 *  - Returns cached data immediately, then silently revalidates in background
 */
export function useSwrCache<T = any>(
  url: string | null,
  options: SwrOptions = {}
) {
  const { ttlMs = 30000, enabled = true } = options;

  const [data, setData] = useState<T | null>(() => {
    if (!url) return null;
    const cached = getCached(url);
    return cached ? (cached.data as T) : null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (!url || !enabled) return false;
    return !getCached(url);
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
      // ── Deduplication: if a request for this URL is already in-flight, ──
      // await the same promise instead of firing a second network request.
      let promise = inflightRequests.get(url);
      if (!promise) {
        promise = api.get(url).then((res) => res.data);
        inflightRequests.set(url, promise);
        promise.finally(() => inflightRequests.delete(url));
      }

      const responseData = await promise;
      if (isMountedRef.current) {
        setCached(url, responseData);
        setData(responseData);
        setError(null);
        setLoading(false);
      }
      return responseData;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err);
        setLoading(false);
      }
    }
  }, [url, enabled]);

  useEffect(() => {
    if (!url || !enabled) return;

    const cached = getCached(url);
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
      setCached(url, nextVal);
      setData(nextVal);
      if (shouldRevalidate) {
        refetch();
      }
    },
    [url, data, refetch]
  );

  return { data, loading, error, refetch, mutate };
}

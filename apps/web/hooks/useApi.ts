'use client';

import useSWR, { SWRConfiguration } from 'swr';
import api from '@/lib/api';

// Shared SWR fetcher backed by the app's axios instance (auth + 401 handling).
export const apiFetcher = (url: string) => api.get(url).then((r) => r.data);

/**
 * Cached GET via SWR. Returns the same fields as useSWR plus a `loading` flag
 * that only reflects the *first* load (so cached navigations render instantly
 * and revalidate in the background).
 *
 * Pass `key = null` to skip the request (e.g. while auth is loading).
 */
export function useApi<T = any>(key: string | null, config?: SWRConfiguration) {
  const swr = useSWR<T>(key, apiFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
    keepPreviousData: true,
    ...config,
  });

  return {
    ...swr,
    loading: swr.isLoading && swr.data === undefined,
  };
}

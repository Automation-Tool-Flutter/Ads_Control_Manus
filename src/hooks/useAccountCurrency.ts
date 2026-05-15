'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { graphFetch } from '@/lib/api/client';
import { useVisibilityRefetch } from './useVisibilityRefetch';

/**
 * Lightweight hook — fetches only the `currency` field for an ad account.
 * Falls back to 'USD' while loading or on error.
 */
export function useAccountCurrency(accountId: string, token: string | null, initialValue?: string): string {
  const [currency, setCurrency] = useState(initialValue ?? 'USD');
  const isFetching = useRef(false);

  const fetch = useCallback(async () => {
    if (!accountId || !token || isFetching.current) return;
    isFetching.current = true;
    try {
      const data = await graphFetch<{ currency: string }>(
        `/${accountId}`,
        { fields: 'currency' },
        token,
      );
      setCurrency(data.currency);
    } catch {/* keep fallback */} finally {
      isFetching.current = false;
    }
  }, [accountId, token]);

  const fetchIfNeeded = useCallback(() => {
    if (!initialValue) fetch();
  }, [fetch, initialValue]);

  useEffect(() => { fetchIfNeeded(); }, [fetchIfNeeded]);
  useVisibilityRefetch(fetchIfNeeded);

  return currency;
}

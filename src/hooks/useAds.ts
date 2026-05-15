'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Ad, AsyncState } from '@/lib/types';
import { getAds } from '@/lib/api/ads';
import { useVisibilityRefetch } from './useVisibilityRefetch';

export function useAds(adsetId: string, token: string | null) {
  const [state, setState] = useState<AsyncState<Ad[]>>({ status: 'idle' });
  const isFetching = useRef(false);

  const fetch = useCallback(async () => {
    if (!adsetId || !token || isFetching.current) return;
    isFetching.current = true;
    setState(prev => prev.status === 'success' ? prev : { status: 'loading' });
    try {
      const data = await getAds(adsetId, token);
      setState({ status: 'success', data });
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load ads',
      });
    } finally {
      isFetching.current = false;
    }
  }, [adsetId, token]);

  useEffect(() => { fetch(); }, [fetch]);

  useVisibilityRefetch(fetch);

  return { state, retry: fetch };
}

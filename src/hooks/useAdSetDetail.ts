'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AdSetDetail, AsyncState } from '@/lib/types';
import { getAdSetDetail } from '@/lib/api/adsetDetail';
import { useVisibilityRefetch } from './useVisibilityRefetch';

export function useAdSetDetail(adsetId: string, token: string | null) {
  const [state, setState] = useState<AsyncState<AdSetDetail>>({ status: 'idle' });
  const isFetching = useRef(false);

  const fetch = useCallback(async () => {
    if (!adsetId || !token || isFetching.current) return;
    isFetching.current = true;
    setState(prev => prev.status === 'success' ? prev : { status: 'loading' });
    try {
      const data = await getAdSetDetail(adsetId, token);
      setState({ status: 'success', data });
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load ad set info',
      });
    } finally {
      isFetching.current = false;
    }
  }, [adsetId, token]);

  useEffect(() => { fetch(); }, [fetch]);

  useVisibilityRefetch(fetch);

  return { state, retry: fetch };
}

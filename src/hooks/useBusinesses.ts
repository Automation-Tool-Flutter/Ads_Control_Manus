'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Business, AsyncState } from '@/lib/types';
import { getBusinesses } from '@/lib/api/businesses';
import { useVisibilityRefetch } from './useVisibilityRefetch';

export function useBusinesses(token: string | null) {
  const [state, setState] = useState<AsyncState<Business[]>>({ status: 'idle' });
  const isFetching = useRef(false);

  const fetch = useCallback(async () => {
    if (!token || isFetching.current) return;
    isFetching.current = true;
    setState(prev => prev.status === 'success' ? prev : { status: 'loading' });
    try {
      const data = await getBusinesses(token);
      setState({ status: 'success', data });
    } catch (err) {
      const isGraphError = err instanceof Error && 'code' in err;
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load businesses',
        errorCode: isGraphError ? (err as { code: number }).code : undefined,
      });
    } finally {
      isFetching.current = false;
    }
  }, [token]);

  useEffect(() => { fetch(); }, [fetch]);

  useVisibilityRefetch(fetch);

  return { state, retry: fetch };
}

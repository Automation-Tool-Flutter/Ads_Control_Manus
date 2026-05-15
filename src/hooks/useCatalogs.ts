'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Catalog, AsyncState } from '@/lib/types';
import { getCatalogs } from '@/lib/api/catalogs';
import { useVisibilityRefetch } from './useVisibilityRefetch';

export function useCatalogs(accountId: string, token: string | null) {
  const [state, setState] = useState<AsyncState<Catalog[]>>({ status: 'idle' });
  const isFetching = useRef(false);

  const fetch = useCallback(async () => {
    if (!accountId || !token || isFetching.current) return;
    isFetching.current = true;
    setState(prev => prev.status === 'success' ? prev : { status: 'loading' });
    try {
      const data = await getCatalogs(accountId, token);
      setState({ status: 'success', data });
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load catalogs',
      });
    } finally {
      isFetching.current = false;
    }
  }, [accountId, token]);

  useEffect(() => { fetch(); }, [fetch]);

  useVisibilityRefetch(fetch);

  return { state, retry: fetch };
}

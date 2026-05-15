'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AccountDetail, AsyncState } from '@/lib/types';
import { getAccountDetail } from '@/lib/api/accountDetail';
import { useVisibilityRefetch } from './useVisibilityRefetch';

export function useAccountDetail(accountId: string, token: string | null) {
  const [state, setState] = useState<AsyncState<AccountDetail>>({ status: 'idle' });
  const isFetching = useRef(false);

  const fetch = useCallback(async () => {
    if (!accountId || !token || isFetching.current) return;
    isFetching.current = true;
    setState(prev => prev.status === 'success' ? prev : { status: 'loading' });
    try {
      const data = await getAccountDetail(accountId, token);
      setState({ status: 'success', data });
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load account info',
      });
    } finally {
      isFetching.current = false;
    }
  }, [accountId, token]);

  useEffect(() => { fetch(); }, [fetch]);

  useVisibilityRefetch(fetch);

  return { state, retry: fetch };
}

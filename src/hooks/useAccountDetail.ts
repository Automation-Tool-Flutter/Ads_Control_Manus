'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AccountDetail, AsyncState } from '@/lib/types';
import { getAccountDetail } from '@/lib/api/accountDetail';
import { useVisibilityRefetch } from './useVisibilityRefetch';

export function useAccountDetail(accountId: string, token: string | null) {
  const [state, setState] = useState<AsyncState<AccountDetail>>({ status: 'idle' });
  const requestId = useRef(0);

  const fetch = useCallback(async () => {
    const id = ++requestId.current;
    if (!accountId || !token) { setState({ status: 'idle' }); return; }
    setState(prev => prev.status === 'success' && prev.data.id === accountId ? prev : { status: 'loading' });
    try {
      const data = await getAccountDetail(accountId, token);
      if (requestId.current === id) setState({ status: 'success', data });
    } catch (err) {
      if (requestId.current === id) setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load account info',
      });
    }
  }, [accountId, token]);

  useEffect(() => { fetch(); return () => { requestId.current++; }; }, [fetch]);

  useVisibilityRefetch(fetch);

  return { state, retry: fetch };
}

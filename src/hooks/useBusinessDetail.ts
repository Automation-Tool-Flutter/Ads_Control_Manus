'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AsyncState, BusinessDetailData } from '@/lib/types';
import { getBusinesses, parseBusinessDetail } from '@/lib/api/businesses';

export type { BusinessDetailData };

export function useBusinessDetail(businessId: string, token: string | null) {
  const [state, setState] = useState<AsyncState<BusinessDetailData>>({ status: 'idle' });

  const fetch = useCallback(async () => {
    if (!token) return;
    setState({ status: 'loading' });
    try {
      const businesses = await getBusinesses(token);
      const biz = businesses.find(b => b.id === businessId);
      if (!biz) throw new Error('Business not found');
      setState({ status: 'success', data: parseBusinessDetail(biz) });
    } catch (err) {
      const isGraphError = err instanceof Error && 'code' in err;
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load business details',
        errorCode: isGraphError ? (err as { code: number }).code : undefined,
      });
    }
  }, [businessId, token]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { state, retry: fetch };
}

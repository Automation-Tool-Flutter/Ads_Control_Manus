'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { InsightsData, DatePreset, DateRange, InsightsLevel, AsyncState } from '@/lib/types';
import { getInsights } from '@/lib/api/insights';
import { useVisibilityRefetch } from './useVisibilityRefetch';

export function useInsights(
  objectId: string,
  dateFilter: DatePreset | DateRange,
  level: InsightsLevel,
  token: string | null
) {
  const [state, setState] = useState<AsyncState<InsightsData>>({ status: 'idle' });
  const isFetching = useRef(false);

  // Serialize dateFilter to use as dependency key
  const dateFilterKey = typeof dateFilter === 'string'
    ? dateFilter
    : `${dateFilter.since}_${dateFilter.until}`;

  const fetch = useCallback(async () => {
    if (!objectId || !token || isFetching.current) return;
    isFetching.current = true;
    setState(prev => prev.status === 'success' ? prev : { status: 'loading' });
    try {
      const data = await getInsights(objectId, dateFilter, level, token);
      setState({ status: 'success', data });
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load insights data',
      });
    } finally {
      isFetching.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectId, dateFilterKey, level, token]);

  useEffect(() => { fetch(); }, [fetch]);

  useVisibilityRefetch(fetch);

  return { state, retry: fetch };
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PageInsightData, DatePreset, DateRange, AsyncState } from '@/lib/types';
import { getPageInsights } from '@/lib/api/pageInsights';
import { presetToRange } from '@/lib/utils';
import { useVisibilityRefetch } from './useVisibilityRefetch';

export function usePageInsights(
  pageId: string,
  token: string | null,
  dateFilter: DatePreset | DateRange = 'last_30d'
) {
  const [state, setState] = useState<AsyncState<PageInsightData>>({ status: 'idle' });
  const isFetching = useRef(false);

  const dateFilterKey = typeof dateFilter === 'string'
    ? dateFilter
    : `${dateFilter.since}_${dateFilter.until}`;

  const fetch = useCallback(async () => {
    if (!pageId || !token || isFetching.current) return;
    isFetching.current = true;
    setState(prev => prev.status === 'success' ? prev : { status: 'loading' });
    const range = typeof dateFilter === 'string' ? presetToRange(dateFilter) : dateFilter;
    try {
      const data = await getPageInsights(pageId, token, range.since, range.until);
      setState({ status: 'success', data });
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load insights',
      });
    } finally {
      isFetching.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, token, dateFilterKey]);

  useEffect(() => { fetch(); }, [fetch]);

  useVisibilityRefetch(fetch);

  return { state, retry: fetch };
}

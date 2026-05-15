'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AdSet, AdSetInsight, AsyncState, DatePreset, DateRange } from '@/lib/types';
import { getAdSets } from '@/lib/api/adsets';
import { useVisibilityRefetch } from './useVisibilityRefetch';

export type { AdSetInsight };

export function useAdSets(campaignId: string, token: string | null, dateFilter: DatePreset | DateRange = 'last_30d') {
  const [state, setState] = useState<AsyncState<AdSet[]>>({ status: 'idle' });
  const [insights, setInsights] = useState<Record<string, AdSetInsight>>({});
  const isFetching = useRef(false);

  const fetchAdSets = useCallback(async () => {
    if (!campaignId || !token || isFetching.current) return;
    isFetching.current = true;
    setState(prev => prev.status === 'success' ? prev : { status: 'loading' });
    try {
      const { adsets, insights: insightsMap } = await getAdSets(campaignId, token, dateFilter);
      setState({ status: 'success', data: adsets });
      setInsights(insightsMap);
    } catch (err) {
      const isGraphError = err instanceof Error && 'code' in err;
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load ad sets',
        errorCode: isGraphError ? (err as { code: number }).code : undefined,
      });
    } finally {
      isFetching.current = false;
    }
  }, [campaignId, token, dateFilter]);

  useEffect(() => { fetchAdSets(); }, [fetchAdSets]);

  useVisibilityRefetch(fetchAdSets);

  return {
    state,
    insights,
    insightsLoading: state.status === 'loading',
    insightsLoaded: state.status === 'success',
    loadInsights: () => {},
    retry: fetchAdSets,
  };
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Campaign, CampaignInsight, AsyncState, DatePreset, DateRange } from '@/lib/types';
import { getCampaigns } from '@/lib/api/campaigns';
import { useVisibilityRefetch } from './useVisibilityRefetch';

export type { CampaignInsight };

export function useCampaigns(accountId: string, token: string | null, dateFilter: DatePreset | DateRange = 'last_30d') {
  const [state, setState] = useState<AsyncState<Campaign[]>>({ status: 'idle' });
  const [insights, setInsights] = useState<Record<string, CampaignInsight>>({});
  const isFetching = useRef(false);

  const fetchCampaigns = useCallback(async () => {
    if (!accountId || !token || isFetching.current) return;
    isFetching.current = true;
    setState(prev => prev.status === 'success' ? prev : { status: 'loading' });
    try {
      const { campaigns, insights: insightsMap } = await getCampaigns(accountId, token, dateFilter);
      setState({ status: 'success', data: campaigns });
      setInsights(insightsMap);
    } catch (err) {
      const isGraphError = err instanceof Error && 'code' in err;
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load campaigns',
        errorCode: isGraphError ? (err as { code: number }).code : undefined,
      });
    } finally {
      isFetching.current = false;
    }
  }, [accountId, token, dateFilter]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  useVisibilityRefetch(fetchCampaigns);

  return {
    state,
    insights,
    insightsLoading: state.status === 'loading',
    insightsLoaded: state.status === 'success',
    loadInsights: () => {},
    retry: fetchCampaigns,
  };
}

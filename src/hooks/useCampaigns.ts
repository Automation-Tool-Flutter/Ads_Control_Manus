'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Campaign, CampaignInsight, AsyncState, DatePreset, DateRange } from '@/lib/types';
import { getCampaigns } from '@/lib/api/campaigns';
import { useVisibilityRefetch } from './useVisibilityRefetch';

export type { CampaignInsight };

export function useCampaigns(accountId: string, token: string | null, dateFilter: DatePreset | DateRange = 'last_30d') {
  const [state, setState] = useState<AsyncState<Campaign[]>>({ status: 'idle' });
  const [insights, setInsights] = useState<Record<string, CampaignInsight>>({});
  const requestId = useRef(0);

  const fetchCampaigns = useCallback(async () => {
    if (!accountId || !token) return;
    const currentRequest = ++requestId.current;
    setState({ status: 'loading' });
    try {
      const { campaigns, insights: insightsMap } = await getCampaigns(accountId, token, dateFilter);
      if (currentRequest !== requestId.current) return;
      setState({ status: 'success', data: campaigns });
      setInsights(insightsMap);
    } catch (err) {
      if (currentRequest !== requestId.current) return;
      const isGraphError = err instanceof Error && 'code' in err;
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load campaigns',
        errorCode: isGraphError ? (err as { code: number }).code : undefined,
      });
    }
  }, [accountId, token, dateFilter]);

  useEffect(() => { fetchCampaigns(); return () => { requestId.current++; }; }, [fetchCampaigns]);

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

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CampaignDetail, AsyncState } from '@/lib/types';
import { getCampaignDetail } from '@/lib/api/campaignDetail';
import { useVisibilityRefetch } from './useVisibilityRefetch';

export function useCampaignDetail(campaignId: string, token: string | null) {
  const [state, setState] = useState<AsyncState<CampaignDetail>>({ status: 'idle' });
  const isFetching = useRef(false);

  const fetch = useCallback(async () => {
    if (!campaignId || !token || isFetching.current) return;
    isFetching.current = true;
    setState(prev => prev.status === 'success' ? prev : { status: 'loading' });
    try {
      const data = await getCampaignDetail(campaignId, token);
      setState({ status: 'success', data });
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load campaign info',
      });
    } finally {
      isFetching.current = false;
    }
  }, [campaignId, token]);

  useEffect(() => { fetch(); }, [fetch]);

  useVisibilityRefetch(fetch);

  return { state, retry: fetch };
}

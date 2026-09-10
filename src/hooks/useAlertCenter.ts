'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getCampaigns } from '@/lib/api/campaigns';
import { getAlertAdSetInsights, getAlertCampaignDailyInsights } from '@/lib/api/alerts';
import { detectAlertCandidates } from '@/lib/alert-detector';
import { collectAlerts } from '@/lib/action-center';
import type { AlertCenterResult, AlertCenterState } from '@/lib/types/alerts';

export function useAlertCenter(accountId: string, token: string | null) {
  const [state, setState] = useState<AlertCenterState>({ status: 'idle' });
  const running = useRef(false);
  const requestId = useRef(0);

  const analyze = useCallback(async () => {
    if (!accountId || !token || running.current) return;
    running.current = true;
    const currentRequest = ++requestId.current;
    setState({ status: 'loading' });
    try {
      const [{ campaigns }, dailyRows, adsetRows] = await Promise.all([
        getCampaigns(accountId, token, 'last_14d'),
        getAlertCampaignDailyInsights(accountId, token),
        getAlertAdSetInsights(accountId, token),
      ]);
      if (currentRequest !== requestId.current) return;
      const candidates = detectAlertCandidates(campaigns, dailyRows, adsetRows);
      const response = await fetch('/api/alert-analysis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates }), signal: AbortSignal.timeout(90_000),
      });
      const result = await response.json();
      if (currentRequest !== requestId.current) return;
      if (!response.ok) throw new Error(result.error ?? 'Alert analysis failed.');
      setState({ status: 'success', result: result as AlertCenterResult });
      collectAlerts(accountId, result as AlertCenterResult);
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      setState({ status: 'error', error: error instanceof Error ? error.message : 'Alert analysis failed.' });
    } finally {
      if (currentRequest === requestId.current) running.current = false;
    }
  }, [accountId, token]);

  // Opening a page must not silently trigger a paid analysis.
  useEffect(() => {
    setState({ status: 'idle' }); running.current = false;
    return () => { requestId.current++; running.current = false; };
  }, [accountId, token]);
  return { state, refresh: analyze };
}

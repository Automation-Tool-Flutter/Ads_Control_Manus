'use client';

import { useCallback, useState } from 'react';
import { getAudienceIntelligenceData } from '@/lib/api/audienceIntelligence';
import type { AudienceIntelligence, AudienceIntelligenceState } from '@/lib/types/audience-intelligence';

export function useAudienceIntelligence(accountId: string, token: string | null, currency: string) {
  const [state, setState] = useState<AudienceIntelligenceState>({ status: 'idle' });
  const analyze = useCallback(async () => {
    if (!accountId || !token) return;
    setState({ status: 'loading' });
    try {
      const data = await getAudienceIntelligenceData(accountId, token);
      const response = await fetch('/api/audience-intelligence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, currency }), signal: AbortSignal.timeout(90_000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Audience analysis failed.');
      setState({ status: 'success', analysis: result as AudienceIntelligence, unavailableBreakdowns: data.unavailableBreakdowns });
    } catch (error) {
      setState({ status: 'error', error: error instanceof Error ? error.message : 'Audience analysis failed.' });
    }
  }, [accountId, token, currency]);
  return { state, analyze };
}

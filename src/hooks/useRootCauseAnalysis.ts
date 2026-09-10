'use client';

import { useCallback, useState } from 'react';
import type { RootCauseAnalysis, RootCausePayload, RootCauseState } from '@/lib/types/root-cause';

export function useRootCauseAnalysis() {
  const [state, setState] = useState<RootCauseState>({ status: 'idle' });

  const analyze = useCallback(async (payload: RootCausePayload) => {
    if (payload.dailyInsights.length < 4) {
      setState({ status: 'error', error: 'At least 4 days of data are required for a meaningful comparison.' });
      return;
    }

    setState({ status: 'analyzing' });
    try {
      const response = await fetch('/api/root-cause-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(90_000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Root-cause analysis failed.');
      setState({ status: 'success', analysis: result as RootCauseAnalysis });
    } catch (error) {
      setState({ status: 'error', error: error instanceof Error ? error.message : 'Root-cause analysis failed.' });
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, analyze, reset };
}

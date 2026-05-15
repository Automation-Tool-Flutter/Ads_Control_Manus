'use client';

import { useState, useCallback } from 'react';
import type { AdSet, AdSetInsight, DatePreset, DateRange, Targeting } from '@/lib/types';
import type { GeminiAnalysis } from '@/lib/types/optimize';
import { dateFilterKey, dateFilterLabel } from '@/lib/utils';
import { readAnalysisCache, writeAnalysisCache } from '@/lib/analysis-cache';

export type AdSetAnalysisStep = 'idle' | 'analyzing' | 'done' | 'error';

export interface AdSetAnalysisState {
  step: AdSetAnalysisStep;
  analysis: GeminiAnalysis | null;
  error: string | null;
}

function getCacheKey(campaignId: string, adsetIds: string[], filterKey: string) {
  const sortedIds = [...adsetIds].sort().join(',');
  return `adset-analysis-${campaignId}-${sortedIds}-${filterKey}`;
}

export function useAdSetAnalysis(campaignId: string) {
  const [state, setState] = useState<AdSetAnalysisState>({
    step: 'idle',
    analysis: null,
    error: null,
  });

  const analyze = useCallback(
    async (
      adsets: AdSet[],
      insights: Record<string, AdSetInsight>,
      currency: string,
      dateFilter: DatePreset | DateRange,
      targeting?: Targeting,
    ) => {
      const key = getCacheKey(campaignId, adsets.map(a => a.id), dateFilterKey(dateFilter));

      const cached = readAnalysisCache(key);
      if (cached) {
        setState({ step: 'done', analysis: cached, error: null });
        return;
      }

      setState({ step: 'analyzing', analysis: null, error: null });

      try {
        const payloadAdSets = adsets.map(a => {
          const insight = insights[a.id];
          return {
            id: a.id,
            name: a.name,
            status: a.status,
            optimization_goal: a.optimization_goal,
            billing_event: a.billing_event,
            daily_budget: a.daily_budget,
            spend: insight?.spend,
            impressions: insight?.impressions,
            reach: insight?.reach,
            frequency: insight?.frequency,
            clicks: insight?.clicks,
            ctr: insight?.ctr,
            cpc: insight?.cpc,
            cpm: insight?.cpm,
          };
        });

        const res = await fetch('/api/adset-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currency,
            dateFilter: dateFilterLabel(dateFilter),
            adsets: payloadAdSets,
            targeting,
            collectedAt: new Date().toISOString(),
          }),
          signal: AbortSignal.timeout(60_000),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Analysis failed.');

        writeAnalysisCache(key, data as GeminiAnalysis);
        setState({ step: 'done', analysis: data as GeminiAnalysis, error: null });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Analysis failed. Please try again.';
        setState({ step: 'error', analysis: null, error: message });
      }
    },
    [campaignId],
  );

  const reset = useCallback(() => {
    setState({ step: 'idle', analysis: null, error: null });
  }, []);

  return { state, analyze, reset };
}

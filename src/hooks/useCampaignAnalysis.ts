'use client';

import { useState, useCallback } from 'react';
import type { Campaign, CampaignInsight, DatePreset, DateRange } from '@/lib/types';
import type { GeminiAnalysis } from '@/lib/types/optimize';
import { dateFilterKey, dateFilterLabel } from '@/lib/utils';
import { readAnalysisCache, writeAnalysisCache } from '@/lib/analysis-cache';
import { getCampaignInsights } from '@/lib/api/campaignInsights';

export type CampaignAnalysisStep = 'idle' | 'analyzing' | 'done' | 'error';

export interface CampaignAnalysisState {
  step: CampaignAnalysisStep;
  analysis: GeminiAnalysis | null;
  error: string | null;
}

function getCacheKey(accountId: string, campaignIds: string[], filterKey: string) {
  const sortedIds = [...campaignIds].sort().join(',');
  return `campaign-analysis-${accountId}-${sortedIds}-${filterKey}`;
}

export function useCampaignAnalysis(accountId: string) {
  const [state, setState] = useState<CampaignAnalysisState>({
    step: 'idle',
    analysis: null,
    error: null,
  });

  const analyze = useCallback(
    async (
      campaigns: Campaign[],
      insights: Record<string, CampaignInsight>,
      currency: string,
      dateFilter: DatePreset | DateRange,
      token?: string | null,
    ) => {
      const key = getCacheKey(accountId, campaigns.map(c => c.id), dateFilterKey(dateFilter));

      const cached = readAnalysisCache(key);
      if (cached) {
        setState({ step: 'done', analysis: cached, error: null });
        return;
      }

      setState({ step: 'analyzing', analysis: null, error: null });

      try {
        // If insights map is empty and token provided, fetch insights inline
        let resolvedInsights = insights;
        if (Object.keys(insights).length === 0 && token) {
          try {
            const fetched = await getCampaignInsights(accountId, dateFilter, token);
            resolvedInsights = Object.fromEntries(fetched.map(i => [i.campaign_id, i]));
          } catch {
            // non-fatal — proceed without insights
          }
        }

        const payloadCampaigns = campaigns.map(c => {
          const insight = resolvedInsights[c.id];
          return {
            id: c.id,
            name: c.name,
            status: c.status,
            objective: c.objective,
            daily_budget: c.daily_budget,
            lifetime_budget: c.lifetime_budget,
            spend: insight?.spend,
            impressions: insight?.impressions,
            clicks: insight?.clicks,
            ctr: insight?.ctr,
            cpc: insight?.cpc,
            cpm: insight?.cpm,
          };
        });

        const res = await fetch('/api/campaign-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currency,
            dateFilter: dateFilterLabel(dateFilter),
            campaigns: payloadCampaigns,
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
    [accountId],
  );

  const reset = useCallback(() => {
    setState({ step: 'idle', analysis: null, error: null });
  }, []);

  return { state, analyze, reset };
}

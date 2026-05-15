'use client';

import { useState, useCallback } from 'react';
import type { DatePreset } from '@/lib/types';
import type {
  OptimizeState,
  OptimizeCacheEntry,
  GeminiAnalysis,
  OptimizePayload,
} from '@/lib/types/optimize';
import { getAccountDetail } from '@/lib/api/accountDetail';
import { getInsights } from '@/lib/api/insights';
import {
  getAccountCampaignInsights,
  getAccountAdSetInsights,
  getAccountAdInsights,
  getAccountAdSetTargeting,
} from '@/lib/api/optimize';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCacheKey(accountId: string, datePreset: DatePreset) {
  return `optimize-${accountId}-${datePreset}`;
}

function sortBySpendDesc<T extends { spend?: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => parseFloat(b.spend ?? '0') - parseFloat(a.spend ?? '0'));
}

export function useOptimizeData(accountId: string, token: string | null) {
  const [state, setState] = useState<OptimizeState>({
    step: 'idle',
    analysis: null,
    error: null,
  });

  const analyze = useCallback(
    async (datePreset: DatePreset) => {
      if (!token) {
        setState({ step: 'error', analysis: null, error: 'Not signed in. Please sign in again.' });
        return;
      }

      // Check sessionStorage cache
      const cacheKey = getCacheKey(accountId, datePreset);
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const entry: OptimizeCacheEntry = JSON.parse(cached);
          if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
            setState({ step: 'done', analysis: entry.analysis, error: null });
            return;
          }
        } catch {
          // invalid cache — ignore and re-fetch
        }
      }

      // Step 1: Collecting data
      setState({ step: 'collecting', analysis: null, error: null });

      let accountData: Awaited<ReturnType<typeof getAccountDetail>>;
      let accountInsights: Awaited<ReturnType<typeof getInsights>>;
      let campaignInsights: Awaited<ReturnType<typeof getAccountCampaignInsights>>;
      let adsetInsights: Awaited<ReturnType<typeof getAccountAdSetInsights>>;
      let adInsights: Awaited<ReturnType<typeof getAccountAdInsights>>;
      let adsetTargeting: Awaited<ReturnType<typeof getAccountAdSetTargeting>>;

      try {
        [
          accountData,
          accountInsights,
          campaignInsights,
          adsetInsights,
          adInsights,
          adsetTargeting,
        ] = await Promise.all([
          getAccountDetail(accountId, token),
          getInsights(accountId, datePreset, 'account', token),
          getAccountCampaignInsights(accountId, datePreset, token),
          getAccountAdSetInsights(accountId, datePreset, token),
          getAccountAdInsights(accountId, datePreset, token),
          getAccountAdSetTargeting(accountId, token),
        ]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to collect data from Facebook API.';
        setState({ step: 'error', analysis: null, error: message });
        return;
      }

      // Step 2: Building context (trim payload)
      setState({ step: 'building', analysis: null, error: null });

      const payload: OptimizePayload = {
        account: accountData,
        accountInsights,
        campaignInsights: sortBySpendDesc(campaignInsights).slice(0, 20),
        adsetInsights: sortBySpendDesc(adsetInsights).slice(0, 30),
        adInsights: sortBySpendDesc(adInsights).slice(0, 20),
        adsetTargeting,
        datePreset,
        collectedAt: new Date().toISOString(),
      };

      // Step 3: Analyzing with Gemini
      setState({ step: 'analyzing', analysis: null, error: null });

      let analysis: GeminiAnalysis;
      try {
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error ?? `Server error (${res.status})`);
        }

        analysis = json as GeminiAnalysis;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to analyze with Gemini AI.';
        setState({ step: 'error', analysis: null, error: message });
        return;
      }

      // Save to sessionStorage cache
      const entry: OptimizeCacheEntry = {
        timestamp: Date.now(),
        datePreset,
        analysis,
      };
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(entry));
      } catch {
        // sessionStorage full or unavailable — skip caching
      }

      setState({ step: 'done', analysis, error: null });
    },
    [accountId, token]
  );

  return { state, analyze };
}

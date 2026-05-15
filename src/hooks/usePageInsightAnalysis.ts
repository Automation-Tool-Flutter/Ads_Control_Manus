'use client';

import { useState, useCallback } from 'react';
import type { PageInsightMetric, DatePreset, DateRange } from '@/lib/types';
import type { GeminiAnalysis } from '@/lib/types/optimize';
import { presetToRange } from '@/lib/utils';
import { readAnalysisCache, writeAnalysisCache } from '@/lib/analysis-cache';

export type InsightAnalysisStep = 'idle' | 'analyzing' | 'done' | 'error';

export interface InsightAnalysisState {
  step: InsightAnalysisStep;
  analysis: GeminiAnalysis | null;
  error: string | null;
}

function getCacheKey(pageId: string, dateRange: string) {
  return `page-insights-analysis-${pageId}-${dateRange}`;
}

export function usePageInsightAnalysis(pageId: string) {
  const [state, setState] = useState<InsightAnalysisState>({
    step: 'idle',
    analysis: null,
    error: null,
  });

  const analyze = useCallback(
    async (metrics: PageInsightMetric[], filter: DatePreset | DateRange) => {
      const range = typeof filter === 'string' ? presetToRange(filter) : filter;
      const dateRange = `${range.since} to ${range.until}`;
      const cacheKey = getCacheKey(pageId, dateRange);

      const cached = readAnalysisCache(cacheKey);
      if (cached) {
        setState({ step: 'done', analysis: cached, error: null });
        return;
      }

      setState({ step: 'analyzing', analysis: null, error: null });

      try {
        const res = await fetch('/api/page-insights-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ metrics, dateRange }),
          signal: AbortSignal.timeout(60_000),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Analysis failed.');

        writeAnalysisCache(cacheKey, data as GeminiAnalysis);
        setState({ step: 'done', analysis: data as GeminiAnalysis, error: null });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Analysis failed. Please try again.';
        setState({ step: 'error', analysis: null, error: message });
      }
    },
    [pageId],
  );

  const reset = useCallback(() => {
    setState({ step: 'idle', analysis: null, error: null });
  }, []);

  return { state, analyze, reset };
}

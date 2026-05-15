'use client';

import { useState } from 'react';
import type { DatePreset, DateRange, InsightsLevel, InsightsData, AsyncState } from '@/lib/types';
import { useInsights } from '@/hooks/useInsights';
import { DateFilter } from './DateFilter';
import { formatSpend, formatNumber, formatPercent } from '@/lib/utils';

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-secondary border border-border/60 rounded-xl p-3">
      <p className="text-[10px] font-medium text-text-muted uppercase tracking-wide mb-1.5 leading-none">{label}</p>
      <p className="text-base font-bold text-text-primary leading-none">{value}</p>
    </div>
  );
}

interface Props {
  objectId: string;
  level: InsightsLevel;
  currency?: string;
  token: string | null;
  dateFilter?: DatePreset | DateRange;
  onDateFilterChange?: (value: DatePreset | DateRange) => void;
  externalState?: AsyncState<InsightsData>;
}

export function InsightsPanel({ objectId, level, currency = 'USD', token, dateFilter: controlledFilter, onDateFilterChange, externalState }: Props) {
  const [internalFilter, setInternalFilter] = useState<DatePreset | DateRange>('last_30d');
  const dateFilter = controlledFilter ?? internalFilter;
  const setDateFilter = onDateFilterChange ?? setInternalFilter;
  // When externalState is provided, skip internal fetch by passing empty objectId
  const { state: internalState } = useInsights(externalState ? '' : objectId, dateFilter, level, token);
  const state = externalState ?? internalState;

  return (
    <div>
      <h2 className="text-base font-semibold text-text-primary mb-2">Performance</h2>

      <DateFilter value={dateFilter} onChange={setDateFilter} />

      <div className="mt-3">
        {/* Loading skeleton */}
        {(state.status === 'idle' || state.status === 'loading') && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-bg-secondary border border-border/60 rounded-xl p-3 animate-pulse">
                <div className="h-2.5 bg-white/10 rounded mb-2.5 w-3/4" />
                <div className="h-5 bg-white/10 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {state.status === 'error' && (
          <div className="bg-status-red/10 border border-status-red/20 rounded-xl px-4 py-3 text-status-red text-sm">
            Failed to load data: {state.error}
          </div>
        )}

        {/* Metrics grid */}
        {state.status === 'success' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetricItem label="Spend" value={state.data.spend ? formatSpend(state.data.spend, currency) : '—'} />
            <MetricItem label="Impressions" value={state.data.impressions ? formatNumber(state.data.impressions) : '—'} />
            <MetricItem label="Reach" value={state.data.reach ? formatNumber(state.data.reach) : '—'} />
            <MetricItem label="Clicks" value={state.data.clicks ? formatNumber(state.data.clicks) : '—'} />
            <MetricItem label="CTR" value={state.data.ctr ? formatPercent(state.data.ctr) : '—'} />
            <MetricItem label="CPC" value={state.data.cpc ? formatSpend(state.data.cpc, currency) : '—'} />
            <MetricItem label="CPM" value={state.data.cpm ? formatSpend(state.data.cpm, currency) : '—'} />
            <MetricItem label="Frequency" value={state.data.frequency ? parseFloat(state.data.frequency).toFixed(2) : '—'} />
          </div>
        )}
      </div>
    </div>
  );
}

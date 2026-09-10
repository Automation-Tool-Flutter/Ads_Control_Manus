'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { InsightsData, InsightActionValue, DatePreset, DateRange, InsightsLevel, AsyncState } from '@/lib/types';
import { getDailyInsights } from '@/lib/api/insights';
import { useVisibilityRefetch } from './useVisibilityRefetch';

function aggregateDailyData(data: InsightsData[]): InsightsData {
  if (data.length === 0) return {};
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalSpend = 0;
  const sumStats = (field: keyof InsightsData): InsightActionValue[] | undefined => {
    const totals = new Map<string, number>();
    for (const row of data) {
      const values = row[field] as InsightActionValue[] | undefined;
      for (const item of values ?? []) {
        totals.set(item.action_type, (totals.get(item.action_type) ?? 0) + Number(item.value || 0));
      }
    }
    return totals.size > 0
      ? Array.from(totals.entries()).map(([action_type, value]) => ({ action_type, value: String(value) }))
      : undefined;
  };
  for (const d of data) {
    totalImpressions += parseFloat(d.impressions ?? '0');
    totalClicks += parseFloat(d.clicks ?? '0');
    totalSpend += parseFloat(d.spend ?? '0');
  }
  return {
    impressions: totalImpressions > 0 ? String(Math.round(totalImpressions)) : undefined,
    clicks: totalClicks > 0 ? String(Math.round(totalClicks)) : undefined,
    spend: totalSpend > 0 ? totalSpend.toFixed(2) : undefined,
    ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(4) : undefined,
    cpc: totalClicks > 0 && totalSpend > 0 ? (totalSpend / totalClicks).toFixed(4) : undefined,
    cpm: totalImpressions > 0 && totalSpend > 0 ? ((totalSpend / totalImpressions) * 1000).toFixed(4) : undefined,
    actions: sumStats('actions'),
    action_values: sumStats('action_values'),
    outbound_clicks: sumStats('outbound_clicks'),
    video_thruplay_watched_actions: sumStats('video_thruplay_watched_actions'),
  };
}

export function useDailyInsights(
  objectId: string,
  dateFilter: DatePreset | DateRange,
  level: InsightsLevel,
  token: string | null
) {
  const [state, setState] = useState<AsyncState<InsightsData[]>>({ status: 'idle' });
  const requestId = useRef(0);

  const dateFilterKey = typeof dateFilter === 'string'
    ? dateFilter
    : `${dateFilter.since}_${dateFilter.until}`;

  const fetch = useCallback(async () => {
    if (!objectId || !token) return;
    const currentRequest = ++requestId.current;
    setState({ status: 'loading' });
    try {
      const data = await getDailyInsights(objectId, dateFilter, level, token);
      if (currentRequest !== requestId.current) return;
      setState({ status: 'success', data });
    } catch (err) {
      if (currentRequest !== requestId.current) return;
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load daily insights',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectId, dateFilterKey, level, token]);

  useEffect(() => { fetch(); return () => { requestId.current++; }; }, [fetch]);

  useVisibilityRefetch(fetch);

  const aggregateState: AsyncState<InsightsData> =
    state.status === 'success'
      ? { status: 'success', data: aggregateDailyData(state.data) }
      : state.status === 'error'
      ? { status: 'error', error: state.error }
      : { status: state.status };

  return { state, aggregateState, retry: fetch };
}

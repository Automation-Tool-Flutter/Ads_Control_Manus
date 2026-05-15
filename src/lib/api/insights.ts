import { graphFetch } from './client';
import { presetToRange } from '../utils';
import { META_NATIVE_PRESETS } from '../constants';
import type { InsightsData, DatePreset, DateRange, InsightsLevel } from '../types';

interface InsightsResponse {
  data: InsightsData[];
}

export async function getInsights(
  objectId: string,
  dateFilter: DatePreset | DateRange,
  level: InsightsLevel,
  token: string
): Promise<InsightsData> {
  const params: Record<string, string> = {
    fields: 'impressions,reach,clicks,spend,ctr,cpc,cpm,frequency',
    level,
    time_increment: 'all_days',
  };

  if (typeof dateFilter === 'string' && META_NATIVE_PRESETS.has(dateFilter)) {
    params.date_preset = dateFilter;
  } else {
    const range = typeof dateFilter === 'string' ? presetToRange(dateFilter) : dateFilter;
    params.time_range = JSON.stringify(range);
  }

  const result = await graphFetch<InsightsResponse>(`/${objectId}/insights`, params, token);
  return result.data?.[0] ?? {};
}

export async function getDailyInsights(
  objectId: string,
  dateFilter: DatePreset | DateRange,
  level: InsightsLevel,
  token: string
): Promise<InsightsData[]> {
  const params: Record<string, string> = {
    fields: 'impressions,reach,clicks,spend,ctr,cpc,cpm,date_start,date_stop',
    level,
    time_increment: '1',
  };

  if (typeof dateFilter === 'string' && META_NATIVE_PRESETS.has(dateFilter)) {
    params.date_preset = dateFilter;
  } else {
    const range = typeof dateFilter === 'string' ? presetToRange(dateFilter) : dateFilter;
    params.time_range = JSON.stringify(range);
  }

  const result = await graphFetch<InsightsResponse>(`/${objectId}/insights`, params, token);
  return result.data ?? [];
}

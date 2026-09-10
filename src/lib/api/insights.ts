import { graphFetch, graphFetchAll } from './client';
import { presetToRange } from '../utils';
import { META_NATIVE_PRESETS } from '../constants';
import type { InsightsData, DatePreset, DateRange, InsightsLevel } from '../types';
import { META_CONVERSION_INSIGHT_FIELDS } from '../campaign-kpis';

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
    fields: `impressions,reach,clicks,spend,ctr,cpc,cpm,frequency,${META_CONVERSION_INSIGHT_FIELDS}`,
    level,
    time_increment: 'all_days',
  };

  if (typeof dateFilter === 'string' && META_NATIVE_PRESETS.has(dateFilter)) {
    params.date_preset = dateFilter;
  } else {
    const range = typeof dateFilter === 'string' ? presetToRange(dateFilter) : dateFilter;
    params.time_range = JSON.stringify(range);
  }

  const result = await graphFetch<InsightsResponse>(`/${objectId}/insights`, params, token, { cache: false });
  return result.data?.[0] ?? {};
}

export async function getDailyInsights(
  objectId: string,
  dateFilter: DatePreset | DateRange,
  level: InsightsLevel,
  token: string
): Promise<InsightsData[]> {
  const params: Record<string, string> = {
    fields: `impressions,reach,clicks,spend,ctr,cpc,cpm,frequency,date_start,date_stop,${META_CONVERSION_INSIGHT_FIELDS}`,
    level,
    time_increment: '1',
  };

  if (typeof dateFilter === 'string' && META_NATIVE_PRESETS.has(dateFilter)) {
    params.date_preset = dateFilter;
  } else {
    const range = typeof dateFilter === 'string' ? presetToRange(dateFilter) : dateFilter;
    params.time_range = JSON.stringify(range);
  }

  return graphFetchAll<InsightsData>(`/${objectId}/insights`, { ...params, limit: '200' }, token, { cache: false });
}

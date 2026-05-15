import { graphFetch } from './client';
import { presetToRange } from '../utils';
import { META_NATIVE_PRESETS } from '../constants';
import type { AdSetInsight, DatePreset, DateRange } from '../types';

interface InsightsResponse {
  data: AdSetInsight[];
}

export async function getAdSetInsights(
  campaignId: string,
  dateFilter: DatePreset | DateRange,
  token: string
): Promise<AdSetInsight[]> {
  const params: Record<string, string> = {
    level: 'adset',
    fields: 'adset_id,spend,impressions,reach,frequency,clicks,ctr,cpc,cpm',
  };

  if (typeof dateFilter === 'string' && META_NATIVE_PRESETS.has(dateFilter)) {
    params.date_preset = dateFilter;
  } else {
    const range = typeof dateFilter === 'string' ? presetToRange(dateFilter) : dateFilter;
    params.time_range = JSON.stringify(range);
  }

  const result = await graphFetch<InsightsResponse>(`/${campaignId}/insights`, params, token);
  return result.data ?? [];
}

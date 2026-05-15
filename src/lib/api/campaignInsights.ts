import { graphFetch } from './client';
import { presetToRange } from '../utils';
import { META_NATIVE_PRESETS } from '../constants';
import type { CampaignInsight, DatePreset, DateRange } from '../types';

interface InsightsResponse {
  data: CampaignInsight[];
}

export async function getCampaignInsights(
  accountId: string,
  dateFilter: DatePreset | DateRange,
  token: string
): Promise<CampaignInsight[]> {
  const params: Record<string, string> = {
    level: 'campaign',
    fields: 'campaign_id,spend,impressions,clicks,ctr,cpc,cpm',
  };

  if (typeof dateFilter === 'string' && META_NATIVE_PRESETS.has(dateFilter)) {
    params.date_preset = dateFilter;
  } else {
    const range = typeof dateFilter === 'string' ? presetToRange(dateFilter) : dateFilter;
    params.time_range = JSON.stringify(range);
  }

  const result = await graphFetch<InsightsResponse>(`/${accountId}/insights`, params, token);
  return result.data ?? [];
}

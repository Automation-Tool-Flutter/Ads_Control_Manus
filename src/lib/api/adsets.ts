import { graphFetch } from './client';
import { presetToRange } from '../utils';
import { META_NATIVE_PRESETS } from '../constants';
import type { AdSet, AdSetInsight, DatePreset, DateRange } from '../types';

interface AdSetWithInsights extends AdSet {
  insights?: { data: AdSetInsight[] };
}

interface AdSetsResponse {
  data: AdSetWithInsights[];
  paging?: object;
}

export async function getAdSets(
  campaignId: string,
  token: string,
  dateFilter: DatePreset | DateRange = 'last_30d'
): Promise<{ adsets: AdSet[]; insights: Record<string, AdSetInsight> }> {
  let insightsParam: string;
  if (typeof dateFilter === 'string' && META_NATIVE_PRESETS.has(dateFilter)) {
    insightsParam = `insights.date_preset(${dateFilter}){adset_id,spend,impressions,reach,frequency,clicks,ctr,cpc,cpm}`;
  } else {
    const range = typeof dateFilter === 'string' ? presetToRange(dateFilter) : dateFilter;
    insightsParam = `insights.time_range(${JSON.stringify(range)}){adset_id,spend,impressions,reach,frequency,clicks,ctr,cpc,cpm}`;
  }

  const result = await graphFetch<AdSetsResponse>(
    `/${campaignId}/adsets`,
    {
      fields: `id,name,status,daily_budget,optimization_goal,billing_event,start_time,${insightsParam}`,
      limit: '50',
    },
    token
  );

  const adsets: AdSet[] = [];
  const insights: Record<string, AdSetInsight> = {};

  for (const { insights: embedded, ...adset } of result.data ?? []) {
    adsets.push(adset);
    if (embedded?.data?.[0]) {
      insights[adset.id] = embedded.data[0];
    }
  }

  return { adsets, insights };
}

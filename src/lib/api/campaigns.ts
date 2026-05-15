import { graphFetch } from './client';
import { presetToRange } from '../utils';
import { META_NATIVE_PRESETS } from '../constants';
import type { Campaign, CampaignInsight, DatePreset, DateRange } from '../types';

interface CampaignWithInsights extends Campaign {
  insights?: { data: CampaignInsight[] };
}

interface CampaignsResponse {
  data: CampaignWithInsights[];
  paging?: object;
}

export async function getCampaigns(
  accountId: string,
  token: string,
  dateFilter: DatePreset | DateRange = 'last_30d'
): Promise<{ campaigns: Campaign[]; insights: Record<string, CampaignInsight> }> {
  let insightsParam: string;
  if (typeof dateFilter === 'string' && META_NATIVE_PRESETS.has(dateFilter)) {
    insightsParam = `insights.date_preset(${dateFilter}){campaign_id,spend,impressions,clicks,ctr,cpc,cpm}`;
  } else {
    const range = typeof dateFilter === 'string' ? presetToRange(dateFilter) : dateFilter;
    insightsParam = `insights.time_range(${JSON.stringify(range)}){campaign_id,spend,impressions,clicks,ctr,cpc,cpm}`;
  }

  const result = await graphFetch<CampaignsResponse>(
    `/${accountId}/campaigns`,
    {
      fields: `id,name,status,objective,daily_budget,lifetime_budget,budget_remaining,start_time,${insightsParam}`,
      limit: '50',
    },
    token
  );

  const campaigns: Campaign[] = [];
  const insights: Record<string, CampaignInsight> = {};

  for (const { insights: embedded, ...campaign } of result.data ?? []) {
    campaigns.push(campaign);
    if (embedded?.data?.[0]) {
      insights[campaign.id] = embedded.data[0];
    }
  }

  return { campaigns, insights };
}

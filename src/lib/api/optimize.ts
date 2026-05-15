import { graphFetch } from './client';
import type { DatePreset } from '../types';
import type {
  CampaignInsightsRow,
  AdSetInsightsRow,
  AdInsightsRow,
  AdSetTargetingRow,
} from '../types/optimize';

const INSIGHT_FIELDS = 'impressions,reach,clicks,spend,ctr,cpc,cpm,frequency';

interface InsightsBulkResponse<T> {
  data: T[];
}

interface AdSetListResponse {
  data: AdSetTargetingRow[];
}

export async function getAccountCampaignInsights(
  accountId: string,
  datePreset: DatePreset,
  token: string
): Promise<CampaignInsightsRow[]> {
  const result = await graphFetch<InsightsBulkResponse<CampaignInsightsRow>>(
    `/${accountId}/insights`,
    {
      fields: INSIGHT_FIELDS,
      date_preset: datePreset,
      level: 'campaign',
      time_increment: 'all_days',
      limit: '500',
    },
    token
  );
  return result.data ?? [];
}

export async function getAccountAdSetInsights(
  accountId: string,
  datePreset: DatePreset,
  token: string
): Promise<AdSetInsightsRow[]> {
  const result = await graphFetch<InsightsBulkResponse<AdSetInsightsRow>>(
    `/${accountId}/insights`,
    {
      fields: INSIGHT_FIELDS,
      date_preset: datePreset,
      level: 'adset',
      time_increment: 'all_days',
      limit: '500',
    },
    token
  );
  return result.data ?? [];
}

export async function getAccountAdInsights(
  accountId: string,
  datePreset: DatePreset,
  token: string
): Promise<AdInsightsRow[]> {
  const result = await graphFetch<InsightsBulkResponse<AdInsightsRow>>(
    `/${accountId}/insights`,
    {
      fields: INSIGHT_FIELDS,
      date_preset: datePreset,
      level: 'ad',
      time_increment: 'all_days',
      limit: '500',
    },
    token
  );
  return result.data ?? [];
}

export async function getAccountAdSetTargeting(
  accountId: string,
  token: string
): Promise<AdSetTargetingRow[]> {
  const result = await graphFetch<AdSetListResponse>(
    `/${accountId}/adsets`,
    {
      fields: 'id,name,optimization_goal,bid_strategy,targeting',
      limit: '500',
    },
    token
  );
  return result.data ?? [];
}

import { graphFetch } from './client';
import { META_CONVERSION_INSIGHT_FIELDS } from '../campaign-kpis';
import type { CampaignDailyAlertRow, AdSetAlertRow } from '../types/alerts';

interface DataResponse<T> { data: T[] }

function dateRange(daysBack: number) {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  return JSON.stringify({ since: iso(since), until: iso(until) });
}

export async function getAlertCampaignDailyInsights(accountId: string, token: string) {
  const response = await graphFetch<DataResponse<CampaignDailyAlertRow>>(`/${accountId}/insights`, {
    level: 'campaign',
    time_range: dateRange(15),
    time_increment: '1',
    fields: `campaign_id,campaign_name,impressions,reach,clicks,spend,ctr,cpc,cpm,frequency,date_start,date_stop,${META_CONVERSION_INSIGHT_FIELDS}`,
    limit: '5000',
  }, token, { cache: false });
  return response.data ?? [];
}

export async function getAlertAdSetInsights(accountId: string, token: string) {
  const response = await graphFetch<DataResponse<AdSetAlertRow>>(`/${accountId}/insights`, {
    level: 'adset',
    date_preset: 'last_7d',
    time_increment: 'all_days',
    fields: `campaign_id,campaign_name,adset_id,adset_name,impressions,reach,clicks,spend,ctr,cpc,cpm,frequency,${META_CONVERSION_INSIGHT_FIELDS}`,
    limit: '5000',
  }, token, { cache: false });
  return response.data ?? [];
}

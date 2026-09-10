import { graphFetch } from './client';
import { META_CONVERSION_INSIGHT_FIELDS } from '../campaign-kpis';
import type { AudienceAdSet, AudienceBreakdownRow, AudienceData } from '../types/audience-intelligence';

interface DataResponse<T> { data: T[] }

const METRICS = `campaign_id,campaign_name,adset_id,adset_name,spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,${META_CONVERSION_INSIGHT_FIELDS}`;

async function breakdown(accountId: string, token: string, breakdowns: string) {
  const response = await graphFetch<DataResponse<AudienceBreakdownRow>>(`/${accountId}/insights`, {
    level: 'adset', date_preset: 'last_30d', time_increment: 'all_days', fields: METRICS, breakdowns, limit: '5000',
  }, token, { cache: false });
  return response.data ?? [];
}

export async function getAudienceIntelligenceData(accountId: string, token: string): Promise<AudienceData> {
  const tasks = [
    graphFetch<DataResponse<AudienceAdSet>>(`/${accountId}/adsets`, {
      fields: `id,name,status,campaign{id,name,objective},optimization_goal,targeting,insights.date_preset(last_30d){${METRICS}}`, limit: '500',
    }, token, { cache: false }).then(result => result.data ?? []),
    breakdown(accountId, token, 'age,gender'),
    breakdown(accountId, token, 'region'),
    breakdown(accountId, token, 'publisher_platform,platform_position'),
  ] as const;
  const results = await Promise.allSettled(tasks);
  if (results[0].status === 'rejected') throw results[0].reason;
  const labels = ['adsets', 'age_gender', 'region', 'placement'];
  const unavailableBreakdowns = results.map((result, index) => result.status === 'rejected' ? labels[index] : null).filter((item): item is string => Boolean(item));
  return {
    adsets: results[0].value,
    ageGender: results[1].status === 'fulfilled' ? results[1].value : [],
    regions: results[2].status === 'fulfilled' ? results[2].value : [],
    placements: results[3].status === 'fulfilled' ? results[3].value : [],
    unavailableBreakdowns,
  };
}

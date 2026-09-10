import { graphFetch } from './client';
import { META_CONVERSION_INSIGHT_FIELDS } from '../campaign-kpis';
import type { CreativeAd } from '../types/creative-intelligence';

interface AdsResponse { data: CreativeAd[] }

export async function getAccountCreativeAds(accountId: string, token: string): Promise<CreativeAd[]> {
  const insightFields = `spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,${META_CONVERSION_INSIGHT_FIELDS}`;
  const response = await graphFetch<AdsResponse>(`/${accountId}/ads`, {
    fields: `id,name,status,effective_status,campaign{id,name,objective},adset{id,name},creative{id,name,title,body,thumbnail_url,image_url,call_to_action_type,object_story_id},preview_shareable_link,insights.date_preset(last_30d){${insightFields}}`,
    limit: '100',
  }, token, { cache: false });
  return response.data ?? [];
}

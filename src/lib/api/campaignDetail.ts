import { graphFetch } from './client';
import type { CampaignDetail } from '../types';

export async function getCampaignDetail(campaignId: string, token: string): Promise<CampaignDetail> {
  return graphFetch<CampaignDetail>(
    `/${campaignId}`,
    {
      fields: 'id,name,status,objective,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time,created_time',
    },
    token
  );
}

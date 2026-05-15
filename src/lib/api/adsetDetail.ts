import { graphFetch } from './client';
import type { AdSetDetail } from '../types';

export async function getAdSetDetail(adsetId: string, token: string): Promise<AdSetDetail> {
  return graphFetch<AdSetDetail>(
    `/${adsetId}`,
    {
      fields:
        'id,name,status,daily_budget,lifetime_budget,optimization_goal,billing_event,start_time,end_time,bid_strategy,targeting{age_min,age_max,genders,geo_locations}',
    },
    token
  );
}

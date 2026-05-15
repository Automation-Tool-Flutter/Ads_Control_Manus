import { graphFetch } from './client';
import type { Ad } from '../types';

interface AdsResponse {
  data: Ad[];
}

export async function getAds(adsetId: string, token: string): Promise<Ad[]> {
  const result = await graphFetch<AdsResponse>(
    `/${adsetId}/ads`,
    {
      fields: 'id,name,status,effective_status,creative{id,name,title,body,thumbnail_url,image_url,call_to_action_type},preview_shareable_link',
      limit: '50',
    },
    token
  );
  return result.data ?? [];
}

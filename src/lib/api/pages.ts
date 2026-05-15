import { graphFetch } from './client';
import type { Page, PagedResult } from '../types';

interface PagesResponse {
  data: Page[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
}

export async function getPages(token: string, cursor?: string): Promise<PagedResult<Page>> {
  const params: Record<string, string> = {
    fields: 'id,name,access_token,category,fan_count,followers_count,picture,verification_status,business{id,name}',
    limit: '50',
  };
  if (cursor) params.after = cursor;

  const result = await graphFetch<PagesResponse>(
    '/me/accounts',
    params,
    token
  );
  return {
    data: result.data ?? [],
    nextCursor: result.paging?.next ? result.paging.cursors?.after : undefined,
  };
}

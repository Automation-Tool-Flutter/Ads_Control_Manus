import { graphFetch } from './client';
import type { PagePost, PagedResult } from '../types';

interface PagePostsResponse {
  data: PagePost[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
}

const POST_FIELDS =
  'id,message,story,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares,reactions.summary(true),status_type,scheduled_publish_time';

const SCHEDULED_POST_FIELDS = 'id,message,story,created_time,full_picture,scheduled_publish_time';

export async function getScheduledPosts(pageId: string, token: string): Promise<PagePost[]> {
  const result = await graphFetch<PagePostsResponse>(
    `/${pageId}/scheduled_posts`,
    { fields: SCHEDULED_POST_FIELDS, limit: '50' },
    token
  );
  return result.data ?? [];
}

export async function getPost(postId: string, token: string): Promise<PagePost> {
  return graphFetch<PagePost>(`/${postId}`, { fields: POST_FIELDS }, token);
}

export async function getPagePosts(
  pageId: string,
  token: string,
  cursor?: string
): Promise<PagedResult<PagePost>> {
  const params: Record<string, string> = {
    fields: POST_FIELDS,
    limit: '20',
  };
  if (cursor) params.after = cursor;

  const result = await graphFetch<PagePostsResponse>(
    `/${pageId}/posts`,
    params,
    token
  );
  return {
    data: result.data ?? [],
    nextCursor: result.paging?.next ? result.paging.cursors?.after : undefined,
  };
}

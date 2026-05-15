import { graphFetch, GraphApiError, cacheInvalidatePrefix } from './client';
import { GRAPH_API_BASE, FB_AUTH_ERROR_CODES, FB_AUTH_ERROR_EVENT } from '../constants';
import type { PageInfo, GraphApiResponse } from '../types';

export async function getPageInfo(pageId: string, token: string): Promise<PageInfo> {
  return graphFetch<PageInfo>(
    `/${pageId}`,
    {
      fields: 'id,name,about,description,website,phone,emails,category,picture,cover,fan_count,followers_count,verification_status',
    },
    token
  );
}

export async function updatePageInfo(
  pageId: string,
  fields: Partial<Pick<PageInfo, 'about' | 'description' | 'website' | 'phone'>> & { email?: string },
  token: string
): Promise<void> {
  const form = new FormData();
  form.append('access_token', token);
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (key === 'email') {
      form.append('emails[0]', String(value));
    } else {
      form.append(key, String(value));
    }
  }
  const response = await fetch(`${GRAPH_API_BASE}/${pageId}`, {
    method: 'POST',
    body: form,
  });
  const json: GraphApiResponse<unknown> = await response.json();
  if (json.error) {
    if (FB_AUTH_ERROR_CODES.includes(json.error.code)) {
      window.dispatchEvent(new CustomEvent(FB_AUTH_ERROR_EVENT));
    }
    throw new GraphApiError(json.error.code, json.error.message, json.error.type);
  }
  // Xóa cache GET của page này để F5 sẽ fetch fresh từ Facebook
  cacheInvalidatePrefix(`${GRAPH_API_BASE}/${pageId}`);
}

export async function updatePagePicture(
  pageId: string,
  file: File,
  token: string
): Promise<void> {
  const form = new FormData();
  form.append('source', file);
  form.append('access_token', token);
  const response = await fetch(`${GRAPH_API_BASE}/${pageId}/picture`, {
    method: 'POST',
    body: form,
  });
  const json: GraphApiResponse<unknown> = await response.json();
  if (json.error) {
    if (FB_AUTH_ERROR_CODES.includes(json.error.code)) {
      window.dispatchEvent(new CustomEvent(FB_AUTH_ERROR_EVENT));
    }
    throw new GraphApiError(json.error.code, json.error.message, json.error.type);
  }
}

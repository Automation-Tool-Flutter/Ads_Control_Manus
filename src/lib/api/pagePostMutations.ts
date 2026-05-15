import { GRAPH_API_BASE } from '../constants';
import { GraphApiError, graphMutate } from './client';
import type { GraphApiResponse } from '../types';

export async function createPagePost(
  pageId: string,
  message: string,
  token: string,
  scheduledPublishTime?: string
): Promise<{ id: string }> {
  const params: Record<string, string> = { message };
  if (scheduledPublishTime) {
    params.scheduled_publish_time = scheduledPublishTime;
    params.published = 'false';
  }
  return graphMutate<{ id: string }>(`/${pageId}/feed`, params, token);
}

/**
 * Upload an image and create a photo post.
 * Uses /{pageId}/photos with multipart/form-data.
 * If multiple images: uploads each as unpublished, then creates a feed post with attached_media.
 */
export async function createPagePostWithPhotos(
  pageId: string,
  message: string,
  images: File[],
  token: string,
  scheduledPublishTime?: string,
): Promise<{ id: string }> {
  if (images.length === 1) {
    // Single image: upload directly as a photo post
    const form = new FormData();
    form.append('source', images[0]);
    form.append('message', message);
    form.append('access_token', token);
    if (scheduledPublishTime) {
      form.append('scheduled_publish_time', scheduledPublishTime);
      form.append('published', 'false');
    }
    const res = await fetch(`${GRAPH_API_BASE}/${pageId}/photos`, { method: 'POST', body: form });
    const json: GraphApiResponse<{ id: string; post_id: string }> = await res.json();
    if (json.error) throw new GraphApiError(json.error.code, json.error.message, json.error.type);
    return { id: (json as { id: string; post_id: string }).post_id ?? (json as { id: string }).id };
  }

  // Multiple images: upload each unpublished, then attach to a feed post
  const photoIds: string[] = await Promise.all(
    images.map(async (file) => {
      const form = new FormData();
      form.append('source', file);
      form.append('published', 'false');
      form.append('access_token', token);
      const res = await fetch(`${GRAPH_API_BASE}/${pageId}/photos`, { method: 'POST', body: form });
      const json: GraphApiResponse<{ id: string }> = await res.json();
      if (json.error) throw new GraphApiError(json.error.code, json.error.message, json.error.type);
      return (json as { id: string }).id;
    })
  );

  const params: Record<string, string> = {
    message,
    attached_media: JSON.stringify(photoIds.map(id => ({ media_fbid: id }))),
  };
  if (scheduledPublishTime) {
    params.scheduled_publish_time = scheduledPublishTime;
    params.published = 'false';
  }
  return graphMutate<{ id: string }>(`/${pageId}/feed`, params, token);
}

export async function deletePagePost(postId: string, token: string): Promise<void> {
  await graphMutate(`/${postId}`, {}, token, 'DELETE');
}

export async function updatePagePost(
  postId: string,
  message: string,
  token: string,
  scheduledPublishTime?: string
): Promise<void> {
  const params: Record<string, string> = { message };
  if (scheduledPublishTime) params.scheduled_publish_time = scheduledPublishTime;
  await graphMutate(`/${postId}`, params, token);
}

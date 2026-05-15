import { graphFetch, graphMutate } from "./client";
import type { PageComment, PagedResult } from "../types";

interface CommentsResponse {
  data: PageComment[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
}

interface PostWithCommentsResponse {
  comments?: {
    data: PageComment[];
    paging?: {
      cursors?: { before: string; after: string };
      next?: string;
    };
  };
}

const REPLY3_FIELDS = "id,message,from{id,name},created_time,like_count,user_likes,can_remove";
const REPLY_FIELDS = `id,message,from{id,name},created_time,like_count,user_likes,can_remove,comments.limit(10){${REPLY3_FIELDS}}`;
const COMMENT_FIELDS = `id,message,created_time,like_count,can_hide,can_remove,is_hidden,user_likes,from{id,name,picture{url}},comments.limit(20){${REPLY_FIELDS}}`;

export async function getPostComments(
  postId: string,
  token: string,
  cursor?: string,
): Promise<PagedResult<PageComment>> {
  // Initial load: lấy comments qua post object để nhận được from{id,name}
  if (!cursor) {
    const result = await graphFetch<PostWithCommentsResponse>(
      `/${postId}`,
      { fields: `comments.summary(true).limit(50){${COMMENT_FIELDS}}` },
      token,
    );
    const c = result.comments ?? { data: [] };
    return {
      data: c.data,
      nextCursor: c.paging?.next ? c.paging.cursors?.after : undefined,
    };
  }

  // Load more: dùng comments edge với cursor
  const result = await graphFetch<CommentsResponse>(
    `/${postId}/comments`,
    { fields: COMMENT_FIELDS, limit: "50", after: cursor },
    token,
  );
  return {
    data: result.data ?? [],
    nextCursor: result.paging?.next ? result.paging.cursors?.after : undefined,
  };
}

export async function replyToComment(
  commentId: string,
  message: string,
  token: string,
): Promise<void> {
  await graphMutate(`/${commentId}/comments`, { message }, token);
}

export async function hideComment(
  commentId: string,
  isHidden: boolean,
  token: string,
): Promise<void> {
  await graphMutate(
    `/${commentId}`,
    { is_hidden: isHidden ? "true" : "false" },
    token,
  );
}

export async function deleteComment(
  commentId: string,
  token: string,
): Promise<void> {
  await graphMutate(`/${commentId}`, {}, token, "DELETE");
}

export async function likeComment(
  commentId: string,
  token: string,
): Promise<void> {
  await graphMutate(`/${commentId}/likes`, {}, token);
}

export async function unlikeComment(
  commentId: string,
  token: string,
): Promise<void> {
  await graphMutate(`/${commentId}/likes`, {}, token, "DELETE");
}

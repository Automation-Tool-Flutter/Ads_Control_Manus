'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePageToken } from '@/hooks/usePageToken';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ErrorState } from '@/components/ui/ErrorState';
import { CommentItem } from '@/components/pages/CommentItem';
import {
  getPostComments,
  replyToComment,
  hideComment,
  deleteComment,
  likeComment,
  unlikeComment,
} from '@/lib/api/pageComments';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toaster';
import { cacheInvalidatePrefix } from '@/lib/api/client';
import { GRAPH_API_BASE } from '@/lib/constants';
import type { PageComment, AsyncState } from '@/lib/types';

type FilterType = 'all' | 'hidden';

export default function CommentsPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const params = useParams<{ pageId: string; postId: string }>();
  const { pageId, postId } = params;
  const searchParams = useSearchParams();
  const pageName = searchParams.get('pageName') ?? pageId;
  const { toast } = useToast();
  const pageToken = usePageToken(pageId, auth.token);

  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace('/login');
  }, [auth.isLoading, auth.token, router]);

  const [commentsState, setCommentsState] = useState<AsyncState<PageComment[]>>({ status: 'idle' });
  const [filter, setFilter] = useState<FilterType>('all');
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const nextCursorRef = useRef<string | undefined>(undefined);
  const isFetching = useRef(false);

  const loadComments = useCallback(async () => {
    if (!pageToken || isFetching.current) return;
    isFetching.current = true;
    setCommentsState(prev => prev.status === 'success' ? prev : { status: 'loading' });
    nextCursorRef.current = undefined;
    setHasMore(false);
    try {
      const result = await getPostComments(postId, pageToken);
      setCommentsState({ status: 'success', data: result.data });
      setHiddenIds(new Set(result.data.filter(c => c.is_hidden).map(c => c.id)));
      nextCursorRef.current = result.nextCursor;
      setHasMore(!!result.nextCursor);
    } catch (err) {
      setCommentsState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load comments',
      });
    } finally {
      isFetching.current = false;
    }
  }, [postId, pageToken]);

  const loadMoreComments = useCallback(async () => {
    if (!pageToken || !nextCursorRef.current || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getPostComments(postId, pageToken, nextCursorRef.current);
      setCommentsState(prev =>
        prev.status === 'success'
          ? { status: 'success', data: [...prev.data, ...result.data] }
          : prev
      );
      // Merge newly loaded hidden ids
      setHiddenIds(prev => {
        const next = new Set(prev);
        result.data.filter(c => c.is_hidden).forEach(c => next.add(c.id));
        return next;
      });
      nextCursorRef.current = result.nextCursor;
      setHasMore(!!result.nextCursor);
    } catch {
      // silently ignore load-more errors
    } finally {
      setLoadingMore(false);
    }
  }, [postId, pageToken, loadingMore]);

  useEffect(() => { loadComments(); }, [loadComments]);

  useEffect(() => {
    if (filter === 'hidden' && hiddenIds.size === 0) setFilter('all');
  }, [hiddenIds.size, filter]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') loadComments();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadComments]);

  async function handleReply(commentId: string, message: string) {
    if (!pageToken) return;
    try {
      await replyToComment(commentId, message, pageToken);
      toast('Reply posted', 'success');
      cacheInvalidatePrefix(`${GRAPH_API_BASE}/${postId}`);
      loadComments();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to post reply', 'error');
      throw err;
    }
  }

  async function handleHide(commentId: string, isHidden: boolean) {
    if (!pageToken) return;
    try {
      await hideComment(commentId, isHidden, pageToken);
      setHiddenIds(prev => {
        const next = new Set(prev);
        if (isHidden) next.add(commentId);
        else next.delete(commentId);
        return next;
      });
      toast(isHidden ? 'Comment hidden' : 'Comment restored', 'success');
      if (isHidden) setFilter('hidden');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update comment', 'error');
      throw err;
    }
  }

  async function handleLike(commentId: string, liked: boolean) {
    if (!pageToken) return;
    if (liked) {
      await likeComment(commentId, pageToken);
    } else {
      await unlikeComment(commentId, pageToken);
    }
  }

  async function handleDelete(commentId: string) {
    setDeleteCommentId(commentId);
  }

  async function confirmDelete() {
    if (!deleteCommentId || !pageToken) return;
    setDeleting(true);
    try {
      // Cascade: delete level-3 children first before deleting level-2 reply
      if (commentsState.status === 'success') {
        for (const c of commentsState.data) {
          const reply = c.comments?.data.find(r => r.id === deleteCommentId);
          if (reply?.comments?.data.length) {
            await Promise.all(reply.comments.data.map(r3 => deleteComment(r3.id, pageToken)));
          }
        }
      }
      await deleteComment(deleteCommentId, pageToken);
      toast('Comment deleted', 'success');
      setDeleteCommentId(null);
      cacheInvalidatePrefix(`${GRAPH_API_BASE}/${postId}`);
      loadComments();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete comment', 'error');
    } finally {
      setDeleting(false);
    }
  }

  const allComments = commentsState.status === 'success' ? commentsState.data : [];
  const filteredComments = filter === 'hidden'
    ? allComments.filter(c => hiddenIds.has(c.id))
    : allComments.filter(c => !hiddenIds.has(c.id));

  if (auth.isLoading) return null;

  return (
    <PageContainer>
      <div className="mb-5">
        <Breadcrumb
          items={[
            { label: 'Pages', href: '/pages' },
            { label: pageName, href: `/pages/${pageId}` },
            { label: 'Comments' },
          ]}
        />
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-3">Manage Comments</h1>
        <p className="text-text-secondary text-sm mt-1 font-mono text-xs">{postId}</p>
      </div>

      {/* Filter tabs — chỉ hiện khi có hidden comment */}
      {hiddenIds.size > 0 && (
        <div className="flex gap-1 mb-4 bg-bg-secondary border border-border rounded-xl p-1">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-bg-card text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('hidden')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === 'hidden'
                ? 'bg-bg-card text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Hidden
            <span className={`text-xs rounded-full px-1.5 py-0.5 ${
              filter === 'hidden' ? 'bg-accent/20 text-accent' : 'bg-white/10 text-text-muted'
            }`}>
              {hiddenIds.size}
            </span>
          </button>
        </div>
      )}

      {commentsState.status === 'loading' && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-white/8 flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 bg-white/8 rounded w-2/5" />
                <div className="h-3 bg-white/5 rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {commentsState.status === 'error' && (
        <ErrorState message={commentsState.error} onRetry={loadComments} />
      )}

      {commentsState.status === 'success' && filteredComments.length === 0 && (
        <p className="text-text-secondary text-sm text-center py-12">
          {filter === 'hidden' ? 'No hidden comments' : 'No comments yet'}
        </p>
      )}

      {commentsState.status === 'success' && filteredComments.length > 0 && (
        <>
          <div className="glass-card gradient-border-card rounded-2xl divide-y divide-border/50">
            {filteredComments.map(comment => (
              <div key={comment.id} className="px-4 group">
                <CommentItem
                  comment={comment}
                  onReply={handleReply}
                  onHide={handleHide}
                  onDelete={handleDelete}
                  onLike={handleLike}
                  isHidden={hiddenIds.has(comment.id)}
                />
              </div>
            ))}
          </div>
          {hasMore && filter === 'all' && (
            <button
              onClick={loadMoreComments}
              disabled={loadingMore}
              className="mt-4 w-full py-2.5 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-white/[0.03] disabled:opacity-50 transition-colors"
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </>
      )}
      <ConfirmDialog
        open={!!deleteCommentId}
        title="Delete comment?"
        description="This comment will be permanently deleted."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteCommentId(null)}
      />
    </PageContainer>
  );
}

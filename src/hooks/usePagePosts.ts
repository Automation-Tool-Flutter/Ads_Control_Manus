'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { PagePost, AsyncState } from '@/lib/types';
import { getPagePosts } from '@/lib/api/pagePosts';
import { useVisibilityRefetch } from './useVisibilityRefetch';
import { GraphApiError } from '@/lib/api/client';

export function usePagePosts(pageId: string, token: string | null) {
  const [state, setState] = useState<AsyncState<PagePost[]>>({ status: 'idle' });
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const nextCursor = useRef<string | undefined>(undefined);
  const isFetching = useRef(false);

  const fetch = useCallback(async () => {
    if (!pageId || !token || isFetching.current) return;
    isFetching.current = true;
    setState(prev => prev.status === 'success' ? prev : { status: 'loading' });
    nextCursor.current = undefined;
    setHasMore(false);
    try {
      const result = await getPagePosts(pageId, token);
      setState({ status: 'success', data: result.data });
      nextCursor.current = result.nextCursor;
      setHasMore(!!result.nextCursor);
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load posts',
        errorCode: err instanceof GraphApiError ? err.code : undefined,
      });
    } finally {
      isFetching.current = false;
    }
  }, [pageId, token]);

  const loadMore = useCallback(async () => {
    if (!pageId || !token || !nextCursor.current || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getPagePosts(pageId, token, nextCursor.current);
      setState(prev =>
        prev.status === 'success'
          ? { status: 'success', data: [...prev.data, ...result.data] }
          : prev
      );
      nextCursor.current = result.nextCursor;
      setHasMore(!!result.nextCursor);
    } catch {
      // silently ignore load-more errors
    } finally {
      setLoadingMore(false);
    }
  }, [pageId, token, loadingMore]);

  useEffect(() => { fetch(); }, [fetch]);

  useVisibilityRefetch(fetch);

  return { state, retry: fetch, loadMore, hasMore, loadingMore };
}

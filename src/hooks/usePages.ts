'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Page, AsyncState } from '@/lib/types';
import { getPages } from '@/lib/api/pages';
import { GraphApiError } from '@/lib/api/client';
import { useVisibilityRefetch } from './useVisibilityRefetch';

export function usePages(token: string | null) {
  const [state, setState] = useState<AsyncState<Page[]>>({ status: 'idle' });
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const nextCursor = useRef<string | undefined>(undefined);
  const isFetching = useRef(false);

  const fetch = useCallback(async () => {
    if (!token || isFetching.current) return;
    isFetching.current = true;
    setState(prev => prev.status === 'success' ? prev : { status: 'loading' });
    nextCursor.current = undefined;
    setHasMore(false);
    try {
      const result = await getPages(token);
      setState({ status: 'success', data: result.data });
      nextCursor.current = result.nextCursor;
      setHasMore(!!result.nextCursor);
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load pages',
        errorCode: err instanceof GraphApiError ? err.code : undefined,
      });
    } finally {
      isFetching.current = false;
    }
  }, [token]);

  const loadMore = useCallback(async () => {
    if (!token || !nextCursor.current || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getPages(token, nextCursor.current);
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
  }, [token, loadingMore]);

  useEffect(() => { fetch(); }, [fetch]);

  useVisibilityRefetch(fetch);

  return { state, retry: fetch, loadMore, hasMore, loadingMore };
}

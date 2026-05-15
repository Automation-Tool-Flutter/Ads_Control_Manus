'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Product, AsyncState } from '@/lib/types';
import { getCatalogProducts } from '@/lib/api/catalogs';
import { useVisibilityRefetch } from './useVisibilityRefetch';

export function useCatalogProducts(catalogId: string, token: string | null) {
  const [state, setState] = useState<AsyncState<Product[]>>({ status: 'idle' });
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const nextCursor = useRef<string | undefined>(undefined);
  const isFetching = useRef(false);

  const fetch = useCallback(async () => {
    if (!catalogId || !token || isFetching.current) return;
    isFetching.current = true;
    setState(prev => prev.status === 'success' ? prev : { status: 'loading' });
    nextCursor.current = undefined;
    setHasMore(false);
    try {
      const result = await getCatalogProducts(catalogId, token);
      setState({ status: 'success', data: result.data });
      nextCursor.current = result.nextCursor;
      setHasMore(!!result.nextCursor);
    } catch (err) {
      setState({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to load products',
      });
    } finally {
      isFetching.current = false;
    }
  }, [catalogId, token]);

  const loadMore = useCallback(async () => {
    if (!catalogId || !token || !nextCursor.current || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await getCatalogProducts(catalogId, token, nextCursor.current);
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
  }, [catalogId, token, loadingMore]);

  useEffect(() => { fetch(); }, [fetch]);

  useVisibilityRefetch(fetch);

  return { state, retry: fetch, loadMore, hasMore, loadingMore };
}

'use client';

import { useMemo } from 'react';
import { usePages } from './usePages';

/**
 * Returns a public Page scope; the server resolves its Page Access Token.
 * Returns null while pages are loading to prevent premature API calls with User Token.
 * New Page Experience endpoints reject User Access Tokens (error_subcode 2069032).
 */
export function usePageToken(pageId: string, userToken: string | null): string | null {
  const { state } = usePages(userToken);

  return useMemo(() => {
    // Wait until pages have loaded — don't fall back to userToken prematurely
    // because userToken is rejected by New Page Experience endpoints
    if (state.status === 'success') {
      const page = state.data.find(p => p.id === pageId);
      // Page scope is available once the signed-in user's Pages have loaded
      return page?.pageScope ?? null;
    }
    // idle / loading / error → return null so downstream hooks don't fire yet
    return null;
  }, [state, pageId]);
}

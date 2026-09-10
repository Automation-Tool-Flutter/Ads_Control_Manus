'use client';

import { useCallback, useState } from 'react';
import { getAccountCreativeAds } from '@/lib/api/creativeIntelligence';
import type { AdAccount, Page, PagePost } from '@/lib/types';
import type { CreativeAnalysis, CreativeIntelligenceState } from '@/lib/types/creative-intelligence';

export function useCreativeIntelligence() {
  const [state, setState] = useState<CreativeIntelligenceState>({ status: 'idle' });
  const analyze = useCallback(async (page: Page, posts: PagePost[], account: AdAccount, token: string) => {
    setState({ status: 'loading' });
    try {
      const ads = await getAccountCreativeAds(account.id, token);
      const response = await fetch('/api/creative-intelligence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(90_000),
        body: JSON.stringify({
          page: { id: page.id, name: page.name, category: page.category, followersCount: page.followers_count },
          account: { id: account.id, name: account.name, currency: account.currency }, posts, ads,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Creative analysis failed.');
      setState({ status: 'success', analysis: result as CreativeAnalysis });
    } catch (error) {
      setState({ status: 'error', error: error instanceof Error ? error.message : 'Creative analysis failed.' });
    }
  }, []);
  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, analyze, reset };
}

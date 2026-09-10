'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const DEPTH_KEY = '__metaAdsNavigationDepth';

function depth() {
  const value: unknown = window.history.state?.[DEPTH_KEY];
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
}

/** Track actual history entries, including query filters and browser Back/Forward. */
export function useAppBack() {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);
  useEffect(() => {
    const history = window.history;
    const push = history.pushState;
    const replace = history.replaceState;
    const sync = () => setCanGoBack(depth() > 0 && history.length > 1);
    const withDepth = (data: unknown, value: number) => ({
      ...(data && typeof data === 'object' ? data : {}),
      [DEPTH_KEY]: value,
    });
    // Keep Next.js routing state intact. Reloads retain the current position;
    // a direct entry starts at zero, even when another site exists in history.
    replace.call(history, withDepth(history.state, depth()), '');
    const trackedPush: History['pushState'] = function (data, unused, url) {
      push.call(history, withDepth(data, depth() + 1), unused, url);
      sync();
    };
    const trackedReplace: History['replaceState'] = function (data, unused, url) {
      replace.call(history, withDepth(data, depth()), unused, url);
      sync();
    };
    history.pushState = trackedPush;
    history.replaceState = trackedReplace;
    window.addEventListener('popstate', sync);
    window.addEventListener('pageshow', sync);
    sync();
    return () => {
      if (history.pushState === trackedPush) history.pushState = push;
      if (history.replaceState === trackedReplace) history.replaceState = replace;
      window.removeEventListener('popstate', sync);
      window.removeEventListener('pageshow', sync);
    };
  }, []);

  const goBack = useCallback((fallback: string) => {
    if (depth() > 0 && window.history.length > 1) router.back();
    else router.replace(fallback);
  }, [router]);
  return { canGoBack, goBack };
}

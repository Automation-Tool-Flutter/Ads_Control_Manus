'use client';

import { useEffect } from 'react';

/**
 * Registers a visibilitychange listener that calls `callback` whenever
 * the page becomes visible (e.g. user returns to tab).
 * The callback should be stable (wrapped in useCallback) to avoid
 * re-registering the listener on every render.
 */
export function useVisibilityRefetch(callback: () => void) {
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') callback();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [callback]);
}

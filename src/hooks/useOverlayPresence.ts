'use client';

import { useEffect, useState } from 'react';

/** Keep focus/scroll isolation until the short closing animation finishes. */
export function useOverlayPresence(open: boolean) {
  const [retained, setRetained] = useState(open);
  useEffect(() => {
    if (open) { setRetained(true); return; }
    if (!retained) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || !window.matchMedia('(max-width: 1023px), (hover: none) and (pointer: coarse)').matches) { setRetained(false); return; }
    const timer = window.setTimeout(() => setRetained(false), 150);
    return () => window.clearTimeout(timer);
  }, [open, retained]);
  return { present: open || retained, closing: !open && retained };
}

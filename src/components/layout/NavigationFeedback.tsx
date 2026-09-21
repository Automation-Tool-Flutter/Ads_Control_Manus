'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/** Animate only committed destinations; route loading boundaries own progress. */
export function NavigationFeedback() {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    const changed = previous.current !== pathname;
    previous.current = pathname;
    if (!changed || window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || !window.matchMedia('(max-width: 1023px), (hover: none) and (pointer: coarse)').matches) return;
    const page = document.querySelector<HTMLElement>('.workspace-shell .workspace-page');
    const animation = page?.animate?.([{ opacity: .82 }, { opacity: 1 }], { duration: 140, easing: 'ease-out' });
    return () => animation?.cancel();
  }, [pathname]);

  return null;
}

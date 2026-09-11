'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LoadingState } from '@/components/ui/LoadingState';

/** Observe navigation without intercepting links, history or Next's scroll restoration. */
export function NavigationFeedback() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  const timers = useRef<number[]>([]);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    const begin = () => {
      timers.current.forEach(window.clearTimeout);
      // Fast cached transitions do not flash a loading indicator.
      timers.current = [window.setTimeout(() => setWaiting(true), 120), window.setTimeout(() => setWaiting(false), 10000)];
    };
    const click = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin === window.location.origin && url.pathname !== window.location.pathname) begin();
    };
    const pop = () => { if (window.location.pathname !== previous.current) begin(); };
    document.addEventListener('click', click, { capture: true, passive: true });
    window.addEventListener('popstate', pop);
    return () => {
      document.removeEventListener('click', click, true);
      window.removeEventListener('popstate', pop);
      timers.current.forEach(window.clearTimeout);
    };
  }, []);

  useEffect(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setWaiting(false);
    const changed = previous.current !== pathname;
    previous.current = pathname;
    if (!changed || window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || !window.matchMedia('(max-width: 1023px), (hover: none) and (pointer: coarse)').matches) return;
    const page = document.querySelector<HTMLElement>('.workspace-shell .workspace-page');
    // Opacity only: transforms on page ancestors would displace fixed action bars/dialogs.
    const animation = page?.animate?.([{ opacity: .82 }, { opacity: 1 }], { duration: 140, easing: 'ease-out' });
    return () => animation?.cancel();
  }, [pathname]);

  return waiting ? <div className="navigation-loading"><LoadingState message="Opening page…" /></div> : null;
}

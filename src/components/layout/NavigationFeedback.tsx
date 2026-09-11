'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LoadingState } from '@/components/ui/LoadingState';
import { MENU_NAVIGATION_START } from '@/lib/menu-navigation';

/** Observe navigation without intercepting links, history or Next's scroll restoration. */
export function NavigationFeedback() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  const timers = useRef<number[]>([]);
  const [waiting, setWaiting] = useState(false);
  const [blocked, setBlocked] = useState<{ from: string; source: string; href: string } | null>(null);
  const [stalled, setStalled] = useState(false);
  const cover = useRef<HTMLDivElement>(null);
  const releaseCover = useRef<() => void>(() => {});

  useEffect(() => {
    let timer = 0, frame = 0;
    const start = (event: Event) => {
      const detail = (event as CustomEvent<{ from: string; source: string; href: string }>).detail;
      if (!detail || typeof detail.from !== 'string' || typeof detail.source !== 'string' || typeof detail.href !== 'string') return;
      releaseCover.current();
      window.clearTimeout(timer); cancelAnimationFrame(frame);
      const elements = Array.from(document.querySelectorAll<HTMLElement>('.workspace-shell, .workspace-sidebar, .ads-mobile-header, .ads-bottom-nav, .ai-floating-root'));
      const previousInert = elements.map(element => element.inert);
      elements.forEach(element => { element.inert = true; });
      releaseCover.current = () => {
        elements.forEach((element, index) => { element.inert = previousInert[index]; });
        window.clearTimeout(timer); cancelAnimationFrame(frame);
        releaseCover.current = () => {};
      };
      setBlocked(detail); setStalled(false);
      frame = requestAnimationFrame(() => cover.current?.focus({ preventScroll: true }));
      // Never uncover the old page just because the request is slow.
      timer = window.setTimeout(() => setStalled(true), 15000);
    };
    window.addEventListener(MENU_NAVIGATION_START, start);
    return () => {
      window.removeEventListener(MENU_NAVIGATION_START, start);
      releaseCover.current();
      delete document.documentElement.dataset.menuNavigation;
    };
  }, []);

  useEffect(() => {
    // A new pathname means Next has committed the destination (or its redirect /
    // loading boundary). Its own data loader can now take over. Starting a request
    // or mounting a fallback while still on the source path is not completion.
    if (!blocked || pathname === blocked.from) return;
    releaseCover.current();
    delete document.documentElement.dataset.menuNavigation;
    setBlocked(null); setStalled(false);
    document.querySelector<HTMLElement>('.workspace-shell main')?.focus({ preventScroll: true });
  }, [pathname, blocked]);

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

  return <>
    {waiting && !blocked && <div className="navigation-loading"><LoadingState message="Opening page…" /></div>}
    <div ref={cover} className="menu-navigation-cover" tabIndex={-1} role="dialog" aria-modal={blocked ? true : undefined} aria-hidden={!blocked} aria-label="Opening destination">
      <div className="menu-navigation-status">
        <LoadingState placement="panel" message={stalled ? 'This page is taking longer than expected.' : 'Opening page…'} />
        {stalled && blocked && <div className="menu-navigation-recovery"><p>The previous page stays hidden while we connect.</p><a href={blocked.href}>Reload destination</a><a className="menu-navigation-cancel" href={blocked.source}>Cancel navigation</a></div>}
      </div>
    </div>
  </>;
}

'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/** Recover a list after async loading, without replacing Next/browser history. */
export function MobileScrollMemory() {
  const pathname = usePathname();
  const { state } = useAuth();
  const positions = useRef(new Map<string, number>());
  const intent = useRef<{ key: string; y: number } | null>(null);
  const owner = useRef(state.user?.id);

  useEffect(() => {
    if (owner.current !== state.user?.id) { positions.current.clear(); intent.current = null; owner.current = state.user?.id; }
    if (!state.user || !window.matchMedia('(max-width: 1023px), (hover: none) and (pointer: coarse)').matches) return;
    const key = pathname + window.location.search;
    let frame = 0, deadline = 0;
    let restoring = false;
    let resize: ResizeObserver | undefined;
    let mutations: MutationObserver | undefined;
    const stop = () => {
      cancelAnimationFrame(frame); window.clearTimeout(deadline);
      resize?.disconnect(); mutations?.disconnect(); restoring = false;
    };
    const cancel = () => { stop(); intent.current = null; };
    const remember = () => {
      if (restoring || document.documentElement.dataset.mobileKeyboard === 'true' || document.querySelector('dialog[open], .ai-floating-root[data-open=true]')) return;
      if (window.location.pathname + window.location.search !== key) return;
      positions.current.delete(key); positions.current.set(key, window.scrollY);
      while (positions.current.size > 40) positions.current.delete(positions.current.keys().next().value!);
    };
    const pop = () => {
      const target = window.location.pathname + window.location.search;
      // Same-page query/hash history remains entirely under Next's control.
      if (window.location.pathname === pathname) return;
      const y = positions.current.get(target);
      intent.current = y === undefined ? null : { key: target, y };
    };
    const click = (event: MouseEvent) => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-mobile-tab]') : null;
      if (!anchor) return;
      remember();
      const url = new URL(anchor.href, window.location.href);
      const target = url.pathname + url.search;
      if (url.origin !== window.location.origin || target === key) return;
      const y = positions.current.get(target);
      intent.current = y === undefined ? null : { key: target, y };
    };
    const target = intent.current;
    if (target?.key === key) {
      restoring = true;
      const shell = document.querySelector<HTMLElement>('.workspace-shell');
      const attempt = () => {
        if (!restoring) return;
        if (shell?.querySelector('[data-view-ready=false]')) return;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (max + 2 < target.y) return;
        window.scrollTo({ top: target.y, behavior: 'instant' });
        intent.current = null; stop();
      };
      const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(attempt); };
      if (shell) {
        resize = new ResizeObserver(schedule); resize.observe(shell);
        mutations = new MutationObserver(schedule); mutations.observe(shell, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-view-ready'] });
      }
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(attempt); });
      deadline = window.setTimeout(cancel, 8000);
    }
    window.addEventListener('scroll', remember, { passive: true });
    window.addEventListener('popstate', pop);
    document.addEventListener('click', click, true);
    // Never pull the viewport away after the user resumes interacting.
    document.addEventListener('pointerdown', cancel, { passive: true });
    document.addEventListener('touchstart', cancel, { passive: true });
    document.addEventListener('wheel', cancel, { passive: true });
    document.addEventListener('keydown', cancel);
    return () => {
      stop();
      window.removeEventListener('scroll', remember); window.removeEventListener('popstate', pop);
      document.removeEventListener('click', click, true); document.removeEventListener('pointerdown', cancel);
      document.removeEventListener('touchstart', cancel); document.removeEventListener('wheel', cancel); document.removeEventListener('keydown', cancel);
    };
  }, [pathname, state.user?.id]);
  return null;
}

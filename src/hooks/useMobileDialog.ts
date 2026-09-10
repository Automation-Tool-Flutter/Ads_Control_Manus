'use client';
import { useEffect, type RefObject } from 'react';
import { lockOverlayScroll } from '@/lib/overlay-scroll';

/** Make the full-screen mobile Copilot usable with keyboard and screen readers. */
export function useMobileDialog(open: boolean, panel: RefObject<HTMLElement>) {
  useEffect(() => {
    if (!open) return;
    const media = window.matchMedia('(max-width: 1023px), (hover: none) and (pointer: coarse)');
    let release = () => {};
    const sync = () => {
      release();
      const element = panel.current;
      if (!media.matches || !element) { release = () => {}; return; }
      const unlock = lockOverlayScroll();
      element.setAttribute('aria-modal', 'true');
      const siblings = Array.from(document.body.querySelectorAll<HTMLElement>('.workspace-shell, .workspace-sidebar, .ads-mobile-header, .ads-bottom-nav'));
      const prior = siblings.map(node => node.inert);
      siblings.forEach(node => { node.inert = true; });
      const viewport = window.visualViewport;
      const resize = () => {
        element.style.setProperty('--mobile-chat-height', `${viewport?.height ?? window.innerHeight}px`);
        element.style.setProperty('--mobile-chat-top', `${viewport?.offsetTop ?? 0}px`);
      };
      const trap = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;
        const items = Array.from(element.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, select, textarea, [tabindex="0"]')).filter(node => node.getClientRects().length);
        const first = items[0]; const last = items[items.length - 1];
        if (!first) { event.preventDefault(); element.focus(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      };
      resize(); viewport?.addEventListener('resize', resize); viewport?.addEventListener('scroll', resize);
      element.addEventListener('keydown', trap);
      release = () => {
        unlock(); element.removeAttribute('aria-modal');
        siblings.forEach((node, index) => { node.inert = prior[index]; });
        viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', resize);
        element.removeEventListener('keydown', trap);
        element.style.removeProperty('--mobile-chat-height'); element.style.removeProperty('--mobile-chat-top');
      };
    };
    sync(); media.addEventListener('change', sync);
    return () => { release(); media.removeEventListener('change', sync); };
  }, [open, panel]);
}

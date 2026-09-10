'use client';

import { useEffect } from 'react';

/** One viewport observer for all sheets and the bottom navigation. */
export function MobileExperience() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    let frame = 0;
    let baseline = window.innerHeight;
    let width = window.innerWidth;
    const sync = () => {
      const height = viewport?.height ?? window.innerHeight;
      const focused = document.activeElement;
      const editing = focused instanceof HTMLElement && focused.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, [contenteditable=true]');
      if (Math.abs(window.innerWidth - width) > 100) { baseline = window.innerHeight; width = window.innerWidth; }
      if (!editing) baseline = Math.max(window.innerHeight, height);
      // Ignore pinch zoom: it should not be treated as an on-screen keyboard.
      const keyboard = editing && (viewport?.scale ?? 1) === 1 && Math.max(baseline, window.innerHeight) - height > 120;
      root.dataset.mobileKeyboard = String(keyboard);
      root.style.setProperty('--app-viewport-height', `${height}px`);
      root.style.setProperty('--app-viewport-top', `${viewport?.offsetTop ?? 0}px`);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(sync); };
    sync();
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      delete root.dataset.mobileKeyboard;
      root.style.removeProperty('--app-viewport-height');
      root.style.removeProperty('--app-viewport-top');
    };
  }, []);
  return null;
}

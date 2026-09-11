'use client';

import { useEffect } from 'react';
import { observeMobileViewport } from '@/lib/observe-mobile-viewport';

/** One viewport observer for all sheets and the bottom navigation. */
export function MobileExperience() {
  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const stopViewport = observeMobileViewport(root, '--app-viewport-height', '--app-viewport-top');
    let frame = 0;
    let baseline = window.innerHeight;
    let width = window.innerWidth;
    const sync = () => {
      frame = 0;
      const height = viewport?.height ?? window.innerHeight;
      const focused = document.activeElement;
      const editing = focused instanceof HTMLElement && focused.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, [contenteditable=true]');
      if (Math.abs(window.innerWidth - width) > 100) { baseline = window.innerHeight; width = window.innerWidth; }
      if (!editing) baseline = Math.max(window.innerHeight, height);
      // Ignore pinch zoom: it should not be treated as an on-screen keyboard.
      const keyboard = editing && (viewport?.scale ?? 1) === 1 && Math.max(baseline, window.innerHeight) - height > 120;
      if (root.dataset.mobileKeyboard !== String(keyboard)) root.dataset.mobileKeyboard = String(keyboard);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(sync); };
    sync();
    viewport?.addEventListener('resize', schedule);
    window.addEventListener('resize', schedule);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    return () => {
      cancelAnimationFrame(frame);
      stopViewport();
      viewport?.removeEventListener('resize', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      delete root.dataset.mobileKeyboard;
    };
  }, []);
  return null;
}

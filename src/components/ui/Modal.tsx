'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { lockOverlayScroll } from '@/lib/overlay-scroll';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';
import { SheetHandle } from './SheetHandle';

/** Native focus isolation, nested dialogs, keyboard-aware sizing and focus return. */
export function Modal({ open, label, onClose, busy = false, children }: {
  open: boolean;
  label: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const { present, closing } = useOverlayPresence(open);
  const backdropStart = useRef(false);
  useEffect(() => {
    const node = dialog.current;
    if (!present || !node) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const release = lockOverlayScroll();
    if (!node.open) node.showModal();
    // Start on the heading/container, not an input that immediately opens the keyboard.
    node.querySelector<HTMLElement>('[data-modal-content]')?.focus({ preventScroll: true });
    return () => {
      node.close();
      release();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [present]);

  return (
    <dialog ref={dialog} className="app-modal" data-closing={closing} aria-label={label} aria-busy={busy || undefined}
      onKeyDown={event => { if (event.key === 'Escape' || event.key === 'Tab') event.stopPropagation(); }}
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
      onPointerDown={event => { backdropStart.current = event.target === event.currentTarget; }}
      onClick={event => {
        if (event.target === event.currentTarget && backdropStart.current && !busy) onClose();
        backdropStart.current = false;
      }}>
      <div ref={content} className="app-modal-content" data-modal-content tabIndex={-1} autoFocus>
        {present && <SheetHandle panel={content} onClose={onClose} disabled={busy} open={open} />}
        {present && children}
      </div>
    </dialog>
  );
}

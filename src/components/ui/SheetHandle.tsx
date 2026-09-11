'use client';

import { useEffect, useRef, type RefObject, type PointerEvent } from 'react';

/** Drag only this handle: scrolling and selection inside forms stay native. */
export function SheetHandle({ panel, onClose, disabled = false, open = true }: {
  panel: RefObject<HTMLDivElement>;
  onClose: () => void;
  disabled?: boolean;
  open?: boolean;
}) {
  const drag = useRef<{ id: number; start: number; time: number; distance: number } | null>(null);
  const frame = useRef(0);
  const animation = useRef<Animation | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    const node = panel.current;
    return () => {
      cancelAnimationFrame(frame.current); frame.current = 0; animation.current?.cancel();
      node?.style.removeProperty('translate'); drag.current = null;
    };
  }, [panel, disabled]);
  useEffect(() => {
    if (!open) return;
    // A rapid reopen may retain the same DOM node during the exit transition.
    cancelAnimationFrame(frame.current); frame.current = 0; animation.current?.cancel();
    panel.current?.style.removeProperty('translate'); drag.current = null;
  }, [open, panel]);

  const finish = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.id) return;
    drag.current = null;
    cancelAnimationFrame(frame.current); frame.current = 0;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const node = panel.current;
    if (!node) return;
    const distance = current.distance;
    suppressClick.current = distance > 5 || cancelled;
    const velocity = distance / Math.max(1, event.timeStamp - current.time);
    if (!cancelled && !disabled && (distance >= 80 || (distance >= 35 && velocity > .55))) {
      node.style.translate = `0 ${Math.min(distance, 180)}px`;
      onClose();
    } else {
      const from = node.style.translate || '0 0px';
      node.style.removeProperty('translate');
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && node.animate) {
        animation.current = node.animate([{ translate: from }, { translate: '0 0px' }], { duration: 160, easing: 'ease-out' });
      }
    }
  };

  return <button type="button" className="mobile-sheet-handle" aria-label="Close dialog" disabled={disabled}
    onPointerDown={event => {
      if (disabled || !event.isPrimary || event.button !== 0) return;
      animation.current?.cancel(); suppressClick.current = false;
      drag.current = { id: event.pointerId, start: event.clientY, time: event.timeStamp, distance: 0 };
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      const current = drag.current;
      if (!current || event.pointerId !== current.id) return;
      current.distance = Math.max(0, event.clientY - current.start);
      if (!frame.current) frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        if (drag.current && panel.current) panel.current.style.translate = `0 ${Math.min(drag.current.distance, 180)}px`;
      });
    }}
    onPointerUp={event => finish(event)}
    onPointerCancel={event => finish(event, true)}
    onLostPointerCapture={event => finish(event, true)}
    onClick={event => {
      if (!disabled && (event.detail === 0 || !suppressClick.current)) onClose();
      suppressClick.current = false;
    }}><span aria-hidden="true" /></button>;
}

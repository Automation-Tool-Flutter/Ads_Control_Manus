'use client';

import { useLayoutEffect, useRef } from 'react';
import { LoadingState } from '@/components/ui/LoadingState';
import { lockOverlayScroll } from '@/lib/overlay-scroll';

export function LogoutLoading() {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const unlock = lockOverlayScroll();
    element.showModal();
    return () => { element.close(); unlock(); };
  }, []);

  return <dialog ref={dialog} tabIndex={-1} aria-label="Signing out" aria-busy="true"
    onCancel={event => event.preventDefault()}
    className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none border-0 p-0 outline-none"
    style={{ background: 'rgb(var(--c-bg-primary))' }}>
    <div className="grid h-full place-items-center">
      <LoadingState message="Signing out…" placement="panel" />
    </div>
  </dialog>;
}

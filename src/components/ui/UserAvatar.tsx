'use client';

import { useState } from 'react';

export function UserAvatar({ name, src, className = '' }: { name: string; src?: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = Boolean(src && src !== failedSrc);
  return <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 text-sm font-semibold text-accent ${className}`}>
    {showImage ? (
      // Facebook supplies the profile image URL; fall back gracefully if it expires.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={`${name || 'User'} profile picture`} width={36} height={36} className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={() => setFailedSrc(src ?? null)} />
    ) : <span aria-label={`${name || 'User'} profile picture`}>{name.trim().charAt(0).toUpperCase() || 'U'}</span>}
  </span>;
}

import Link from 'next/link';
import type { ReactNode } from 'react';

export function ChatEntityLink({ href, children, className = '', title, arrow = false }: {
  href: string | null; children: ReactNode; className?: string; title?: string; arrow?: boolean;
}) {
  if (!href) return <div className={`${className} meta-chat-unavailable-link`} title="Destination unavailable in the current account data">{children}</div>;
  return <Link href={href} className={`meta-chat-entity-link ${className}`} title={title}>{children}{arrow && <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M7 7h10v10" /></svg>}</Link>;
}

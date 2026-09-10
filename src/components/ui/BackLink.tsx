import Link from 'next/link';

export function BackLink({ href, label, className = '', iconOnly = false }: { href: string; label: string; className?: string; iconOnly?: boolean }) {
  return (
    <Link href={href} className={`context-back-link ${className}`} aria-label={`Back to ${label}`} title={`Back to ${label}`}>
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="m12 5-7 7 7 7M5 12h14" />
      </svg>
      <span className={iconOnly ? 'sr-only' : undefined}>Back to {label}</span>
    </Link>
  );
}

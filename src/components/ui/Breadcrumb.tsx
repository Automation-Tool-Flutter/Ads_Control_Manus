import { Fragment } from 'react';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
}

function Chevron() {
  return (
    <svg className="w-3 h-3 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

export function Breadcrumb({ items }: Props) {
  if (items.length === 0) return null;
  const last = items.length - 1;
  const collapse = items.length > 3;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 sm:gap-1.5 text-sm text-text-secondary overflow-hidden">
      {items.map((item, i) => {
        // Middle items (not first, not last 2) are hidden on mobile when collapsing
        const hiddenOnMobile = collapse && i > 0 && i < last - 1;
        // At index 1 we inject the ellipsis placeholder (mobile only, before hiding item)
        const showEllipsis = collapse && i === 1;
        const isLast = i === last;

        return (
          <Fragment key={i}>
            {/* Ellipsis shown on mobile in place of hidden middle items */}
            {showEllipsis && (
              <span className="sm:hidden flex items-center gap-1 text-text-muted flex-shrink-0">
                <Chevron />
                <span className="text-xs tracking-widest">···</span>
              </span>
            )}

            <span className={`flex items-center gap-1 sm:gap-1.5 min-w-0 ${hiddenOnMobile ? 'hidden sm:flex' : 'flex'}`}>
              {i > 0 && <Chevron />}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-text-primary transition-colors truncate max-w-[100px] sm:max-w-[180px]"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={`truncate max-w-[140px] sm:max-w-[220px] ${isLast ? 'text-text-primary font-medium' : ''}`}>
                  {item.label}
                </span>
              )}
            </span>
          </Fragment>
        );
      })}
    </nav>
  );
}

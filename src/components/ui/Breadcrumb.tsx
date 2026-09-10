import { Fragment } from 'react';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}
interface Props {
  items: BreadcrumbItem[];
  /** ControlHeader already provides the page title directly below this row. */
  mobileShowCurrent?: boolean;
}

export function Breadcrumb({ items, mobileShowCurrent = true }: Props) {
  if (!items.length) return null;
  const current = items[items.length - 1];
  return <>
    {mobileShowCurrent && <nav aria-label="Current page" className="mobile-breadcrumb lg:hidden">
      <span aria-current="page" className="mobile-breadcrumb-current">{current.label}</span>
    </nav>}
    <nav aria-label="Breadcrumb" className="desktop-breadcrumb hidden min-w-0 flex-wrap items-center gap-1.5 text-sm text-text-secondary lg:flex">
      {items.map((item, index) => <Fragment key={index}>
        {index > 0 && <svg aria-hidden="true" className="h-3 w-3 shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7"/></svg>}
        {item.href && index < items.length - 1 ? <Link href={item.href} title={item.label} className="max-w-[180px] truncate hover:text-text-primary">{item.label}</Link> :
          <span aria-current={index === items.length - 1 ? 'page' : undefined} title={item.label} className="max-w-[240px] truncate font-medium text-text-primary">{item.label}</span>}
      </Fragment>)}
    </nav>
  </>;
}

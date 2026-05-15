'use client';

import { usePathname } from 'next/navigation';

const TOP_LEVEL_ROUTES = ['/accounts', '/businesses', '/pages', '/settings'];

export function NavSpacer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isTopLevel = TOP_LEVEL_ROUTES.some(r => pathname === r);
  return (
    <div className={`flex flex-col flex-1 sm:pl-[116px] ${isTopLevel ? 'pb-bottom-nav' : ''} sm:pb-0`}>
      {children}
    </div>
  );
}

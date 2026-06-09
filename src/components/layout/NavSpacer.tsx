'use client';

import { usePathname } from 'next/navigation';

const APP_NAV_PATHS = new Set(['/businesses', '/accounts', '/pages', '/settings']);

export function NavSpacer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasPublicHomeNav = pathname === '/';
  const hasAppNav = APP_NAV_PATHS.has(pathname);
  const shellOffset = hasPublicHomeNav || hasAppNav ? 'pb-[calc(76px+env(safe-area-inset-bottom))] sm:pb-0 sm:pl-[280px]' : '';
  return (
    <div className={`flex flex-col flex-1 ${shellOffset}`}>
      {children}
    </div>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { WORKBENCH_SECTIONS } from './WorkbenchNavigation';

export function NavSpacer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state } = useAuth();
  const hasPublicHomeNav = pathname === '/';
  // Only section roots repeat the mobile app bar. Entity/detail headings carry
  // names and context that must remain visible.
  const accountBase = pathname.startsWith('/accounts/') ? '/accounts/' + pathname.split('/')[2] : '';
  const titleInAppBar = ['/accounts', '/businesses', '/pages', '/settings'].includes(pathname)
    || Boolean(accountBase && WORKBENCH_SECTIONS.some(section => section.items.some(([path]) => pathname === accountBase + path)));
  const shellOffset = pathname === '/login' ? '' : (hasPublicHomeNav || state.user ? 'lg:pl-[264px] ' : '') + (state.user ? 'mobile-app-content' : '');
  return (
    <div data-title-in-app-bar={Boolean(state.user && titleInAppBar)} className={`workspace-shell flex min-w-0 flex-col flex-1 ${shellOffset}`}>
      {children}
    </div>
  );
}

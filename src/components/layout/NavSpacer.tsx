'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function NavSpacer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state } = useAuth();
  const hasPublicHomeNav = pathname === '/';
  const shellOffset = (hasPublicHomeNav || state.user ? 'lg:pl-[264px] ' : '') + (state.user ? 'mobile-app-content' : '');
  return (
    <div className={`workspace-shell flex min-w-0 flex-col flex-1 ${shellOffset}`}>
      {children}
    </div>
  );
}

'use client';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountDetail } from '@/hooks/useAccountDetail';
import { MobileNavBar } from './MobileNavBar';

export function BottomNav() {
  const pathname = usePathname();
  const { state } = useAuth();
  const base = pathname.startsWith('/accounts/') ? '/accounts/' + pathname.split('/')[2] : '';
  const { state: account } = useAccountDetail(base ? pathname.split('/')[2] : '', state.token);
  const query = account.status === 'success' && base === '/accounts/' + account.data.id ? '?accountName=' + encodeURIComponent(account.data.name) + '&currency=' + encodeURIComponent(account.data.currency) : '';
  if (!state.user || pathname === '/login') return null;
  return <MobileNavBar base={base} query={query} pathname={pathname} onMenu={() => window.dispatchEvent(new Event('open-workspace-menu'))} onAI={() => window.dispatchEvent(new Event('open-ai-assistant'))} />;
}

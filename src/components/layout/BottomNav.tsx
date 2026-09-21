'use client';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { hasMobileTabBar } from '@/lib/mobile-navigation';
import { MobileNavBar } from './MobileNavBar';

export function BottomNav() {
  const pathname = usePathname();
  const { state } = useAuth();
  if (!state.user || !hasMobileTabBar(pathname)) return null;
  return <MobileNavBar base="" query="" pathname={pathname} onMenu={() => window.dispatchEvent(new Event('open-workspace-menu'))} onAI={() => window.dispatchEvent(new Event('open-ai-assistant'))} />;
}

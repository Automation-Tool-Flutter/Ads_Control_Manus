'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/contexts/AuthContext';
import { MobileScrollMemory } from './MobileScrollMemory';
import { AuthNotifier } from './AuthNotifier';
import { Header } from './Header';
import { NavSpacer } from './NavSpacer';
import { WorkspaceBar } from './WorkspaceBar';
import { BottomNav } from './BottomNav';
import { FloatingAssistant } from '@/components/ai/FloatingAssistant';
import { WorkspaceNavigator } from './WorkspaceNavigator';

const publicDocuments = new Set(['/privacy-policy', '/terms-of-service', '/privacy', '/terms', '/data-deletion']);

export function ApplicationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Legal documents must render without a session request or workspace overlays.
  if (publicDocuments.has(pathname.replace(/\/$/, ''))) return <>{children}</>;
  return <AuthProvider>
    <MobileScrollMemory />
    <AuthNotifier />
    <Header />
    <NavSpacer><WorkspaceBar />{children}</NavSpacer>
    <BottomNav />
    <FloatingAssistant />
    <WorkspaceNavigator />
  </AuthProvider>;
}

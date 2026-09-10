'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdsIcon } from './AdsIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { WORKBENCH_SECTIONS } from './WorkbenchNavigation';
import { UserAvatar } from '@/components/ui/UserAvatar';

export function WorkspaceBar() {
  const pathname = usePathname();
  const { state } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const accountBase = pathname.startsWith('/accounts/') ? '/accounts/' + pathname.split('/')[2] : '';
  const activeTool = accountBase ? WORKBENCH_SECTIONS.flatMap(group => group.items).filter(([path]) => path && (pathname === accountBase + path || pathname.startsWith(accountBase + path + '/'))).sort((a,b) => b[0].length-a[0].length)[0]?.[1] ?? 'Performance overview' : null;
  if (!state.token) return null;
  const section = pathname.startsWith('/pages') ? 'Page' : pathname.startsWith('/businesses') ? 'Business assets' : pathname.startsWith('/settings') ? 'Workspace settings' : 'Advertising intelligence';
  return <div className="workspace-bar">
    <div className="min-w-0"><p className="text-[10px] font-medium uppercase tracking-[.15em] text-text-muted">Workspace <span className="mx-1 text-border">/</span> {accountBase ? 'Ad intelligence' : section}</p><p className="mt-1 truncate text-sm font-semibold text-text-primary">{activeTool ?? (pathname === '/accounts' ? 'Portfolio overview' : section)}</p></div>
    <div className="flex shrink-0 items-center gap-2">
      <button onClick={() => window.dispatchEvent(new Event('open-workspace-navigator'))} className="hidden items-center gap-6 rounded-xl border border-border bg-bg-secondary/30 px-3 py-2 text-xs text-text-muted md:flex"><AdsIcon name="search" className="h-4 w-4" /> Search your workspace <kbd className="text-[10px]">Ctrl K</kbd></button>
      <Link href="/accounts" className="hidden rounded-xl px-3 py-2 text-xs font-semibold text-text-secondary hover:bg-bg-secondary md:block">Switch account</Link>
      <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-text-secondary">{resolvedTheme === 'dark' ? '☀' : '☾'}</button>
      <button onClick={() => window.dispatchEvent(new Event('open-ai-assistant'))} className="ai-primary-button"><AdsIcon name="ai" className="h-4 w-4" /><span className="hidden sm:inline">Ask AI</span></button>
      {state.user && <Link href="/settings" aria-label="Open profile settings" title={state.user.name} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border hover:border-accent"><UserAvatar name={state.user.name} src={state.user.picture?.data?.url} /></Link>}
    </div>
  </div>;
}

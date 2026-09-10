'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { lockOverlayScroll } from '@/lib/overlay-scroll';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountDetail } from '@/hooks/useAccountDetail';
import { WORKBENCH_SECTIONS } from './WorkbenchNavigation';

export function WorkspaceNavigator() {
  const { state } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const base = pathname.startsWith('/accounts/') ? '/accounts/' + pathname.split('/')[2] : '';
  const { state: account } = useAccountDetail(base ? pathname.split('/')[2] : '', state.token);
  const query = account.status === 'success' && base === '/accounts/' + account.data.id ? `?accountName=${encodeURIComponent(account.data.name)}&currency=${encodeURIComponent(account.data.currency)}` : '';
  const routes = [
    {label:'Ad accounts',href:'/accounts',group:'Workspace'},
    {label:'Business assets',href:'/businesses',group:'Workspace'},
    {label:'Page',href:'/pages',group:'Workspace'},
    {label:'Settings',href:'/settings',group:'Workspace'},
    ...(base ? WORKBENCH_SECTIONS.flatMap(section => section.items.map(([path,label]) => ({label,href:base+path+query,group:section.title}))) : []),
  ].filter(item => (item.label + ' ' + item.group).toLowerCase().includes(search.toLowerCase().trim()));
  useEffect(() => {
    if (!state.token) return;
    const show = () => { setSearch(''); setOpen(true); };
    const key = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); show(); } };
    window.addEventListener('keydown',key); window.addEventListener('open-workspace-navigator',show);
    return () => { window.removeEventListener('keydown',key); window.removeEventListener('open-workspace-navigator',show); };
  }, [state.token]);
  useEffect(() => { if(open && dialog.current && !dialog.current.open) dialog.current.showModal(); else if(!open) dialog.current?.close(); }, [open]);
  useEffect(() => { if (open) return lockOverlayScroll(); }, [open]);
  useEffect(() => { setOpen(false); }, [pathname]);
  if (!state.token) return null;
  return <dialog ref={dialog} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} aria-labelledby="navigator-title" className="workspace-navigator w-[min(600px,calc(100vw-24px))] rounded-2xl border border-border bg-bg-card p-0 text-text-primary shadow-2xl">
    <div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 id="navigator-title" className="text-sm font-bold">Go to a workspace</h2><button onClick={() => setOpen(false)} aria-label="Close navigation" className="rounded-lg border border-border px-2 py-1 text-xs text-text-muted">Esc</button></div>
    <form onSubmit={event => { event.preventDefault(); if(routes[0]) { setOpen(false); router.push(routes[0].href); } }} className="p-4"><input autoFocus aria-label="Search workspace tools" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search analysis, budgets, campaigns…" className="w-full rounded-xl border border-border bg-bg-secondary/50 p-3 text-sm outline-none focus:border-accent" /></form>
    <div className="max-h-[50dvh] overflow-y-auto px-3 pb-3">{routes.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl p-3 text-sm hover:bg-accent/10 focus:bg-accent/10"><span>{item.label}</span><span className="text-[10px] text-text-muted">{item.group}</span></Link>)}{!routes.length && <p className="p-6 text-sm text-text-muted">No matching tools. Try a different keyword.</p>}</div>
    {!base && <p className="border-t border-border p-4 text-xs text-text-muted">Open an ad account to access its analysis and execution tools.</p>}
  </dialog>;
}

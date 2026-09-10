'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdsIcon } from './AdsIcon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { WORKBENCH_SECTIONS } from './WorkbenchNavigation';
import { MobileNavBar } from './MobileNavBar';

const SHORT_NAMES: Record<string, string> = {
  '/optimize': 'Performance', '/audiences': 'Audiences', '/budget-optimizer': 'Budgets',
  '/campaign-builder': 'Create campaign', '/campaigns': 'Campaigns', '/optimization-plan': 'Growth plans',
  '/ai-learning': 'Learning', '/catalogs': 'Catalogs',
};
const QUICK = new Set(['/optimize', '/budget-optimizer', '/campaigns', '/actions', '/campaign-builder', '/alerts']);
const BUILD = new Set(['/campaigns', '/campaign-builder', '/optimization-plan', '/catalogs']);
export const MOBILE_TOOL_FILTERS = ['Quick access', 'All tools', 'Analyze', 'Build', 'Workspace'] as const;
type Filter = typeof MOBILE_TOOL_FILTERS[number];
export function mobileTools(base: string, query: string) {
  return [
    ...WORKBENCH_SECTIONS.flatMap(section => section.items.map(([path, title, icon]) => ({
      id: path || 'overview', label: SHORT_NAMES[path] ?? title, keywords: title + ' ' + section.title,
      icon, href: base ? base + path + query : '/accounts', accountRequired: !base,
      category: BUILD.has(path) ? 'Build' : 'Analyze', quick: QUICK.has(path),
    }))),
    ...[['/accounts', 'Switch account', 'grid'], ['/pages', 'Page', 'page'], ['/businesses', 'Business assets', 'audience'], ['/settings', 'Settings', 'settings']].map(([href,label,icon]) => ({
      id: href, href, label, icon, keywords: label, category: 'Workspace', quick: false, accountRequired: false,
    })),
  ];
}

export function MobileToolMenu({ accountBase, query, accountName, pathname, name, picture, userId, focusSearch = false, onClose, onLogout }: {
  accountBase: string; query: string; accountName?: string; pathname: string;
  name: string; picture?: string; onClose: () => void; onLogout: () => void;
  userId: string; focusSearch?: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>(accountBase ? 'Quick access' : 'Workspace');
  const [pins, setPins] = useState<string[]>(Array.from(QUICK));
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const filters = useRef<HTMLDivElement>(null);
  const tools = mobileTools(accountBase, query);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('mobile-tool-pins:' + userId) ?? 'null');
      if (Array.isArray(saved)) setPins(Array.from(new Set(saved.filter((id): id is string => typeof id === 'string' && mobileTools('', '').some(tool => tool.id === id)))).slice(0, 6));
    } catch { /* Use defaults if browser storage is unavailable. */ }
  }, [userId]);
  useEffect(() => { scrollArea.current?.scrollTo({top: 0}); }, [search, filter, editing]);
  useEffect(() => { filters.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({block: 'nearest', inline: 'nearest'}); }, [filter]);
  const customize = () => { setEditing(true); setFilter('All tools'); setSearch(''); setMessage('Choose up to 6 shortcuts. Tap a tile to pin or unpin it.'); };
  const togglePin = (id: string) => {
    if (pins.includes(id)) { setPins(pins.filter(pin => pin !== id)); setMessage(''); }
    else if (pins.length < 6) { setPins([...pins, id]); setMessage(''); }
    else setMessage('You have 6 shortcuts. Unpin one before adding another.');
  };
  const savePins = () => {
    try { localStorage.setItem('mobile-tool-pins:' + userId, JSON.stringify(pins)); setEditing(false); setFilter('Quick access'); setSearch(''); setMessage('Shortcuts saved on this device.'); }
    catch { setMessage('Unable to save shortcuts on this device. Your selection is kept until this menu closes.'); }
  };
  const term = search.trim().toLowerCase();
  const visible = tools.filter(tool => term ? (tool.label + ' ' + tool.keywords).toLowerCase().includes(term) : filter === 'All tools' || (filter === 'Quick access' ? pins.includes(tool.id) : tool.category === filter));
  const active = (href: string) => {
    const path = href.split('?')[0];
    return pathname === path || (path !== accountBase && path !== '/accounts' && pathname.startsWith(path + '/'));
  };
  return <div className="mobile-tools-shell" data-editing={editing}>
    <div className="mobile-tools-heading"><div><p>Meta Ads AI WORKSPACE</p><h2 id="mobile-tools-title">{editing ? 'Choose shortcuts' : 'Your tools'}</h2></div><button autoFocus={!focusSearch} onClick={onClose} aria-label="Close tools" className="mobile-tools-close"><AdsIcon name="close"/></button></div>
    <Link href="/accounts" onClick={onClose} className="mobile-tools-account"><span><AdsIcon name="campaign" /></span><div><small>{accountBase ? 'CURRENT ACCOUNT' : 'GET STARTED'}</small><strong>{accountName || (accountBase ? 'Account workspace' : 'Choose an ad account')}</strong></div><b>Switch ›</b></Link>
    <form role="search" className="mobile-tools-search" onSubmit={event => {event.preventDefault(); if (!editing && visible[0]) {onClose();router.push(visible[0].href);}}}>
      <AdsIcon name="search" /><input ref={searchInput} autoFocus={focusSearch} type="search" enterKeyHint="go" autoComplete="off" spellCheck={false} aria-label="Search all tools" placeholder="Search tools…" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => {if(event.key === 'Escape' && search) {event.preventDefault();event.stopPropagation();setSearch('');}}} />
      {search && <button type="button" onClick={() => {setSearch('');searchInput.current?.focus();}} aria-label="Clear search"><AdsIcon name="close"/></button>}
    </form>
    <div className="mobile-tools-filters" ref={filters} role="group" aria-label="Filter tools">{MOBILE_TOOL_FILTERS.map(value => <button key={value} aria-pressed={!term && filter === value} onClick={() => {setFilter(value);setSearch('');}}>{value}</button>)}</div>
    <div className="mobile-tools-scroll" ref={scrollArea}>
      <div className="mobile-tools-section-title"><p className="mobile-tools-result" role="status">{editing ? pins.length + ' of 6 pinned' : term ? visible.length + ' matching tools' : filter === 'Quick access' ? 'Your shortcuts' : visible.length + ' tools'}</p>{!editing && <button onClick={customize}>Customize</button>}</div>
      {message && <p role="status" className="mobile-tools-hint">{message}</p>}
      {!accountBase && <p className="mobile-tools-hint">Account tools open the account picker first.</p>}
      <nav aria-label="Mobile tools" className="mobile-tools-grid">{visible.map(tool => editing ?
        <button key={tool.id} onClick={() => togglePin(tool.id)} aria-pressed={pins.includes(tool.id)} aria-label={(pins.includes(tool.id) ? 'Unpin ' : 'Pin ') + tool.label} className="mobile-tool-tile mobile-tool-pin"><span className="mobile-tool-icon"><AdsIcon name={tool.icon}/></span><span className="min-w-0"><strong>{tool.label}</strong><small>{pins.includes(tool.id) ? 'Pinned ✓' : 'Tap to pin'}</small></span></button> :
        <Link key={tool.id} href={tool.href} onClick={onClose} aria-current={!tool.accountRequired && active(tool.href) ? 'page' : undefined} className="mobile-tool-tile"><span className="mobile-tool-icon"><AdsIcon name={tool.icon}/></span><span className="min-w-0"><strong>{tool.label}</strong>{tool.accountRequired && <small>Select account</small>}</span></Link>
      )}</nav>
      {!visible.length && <div className="mobile-tools-empty"><p>{!term && filter === 'Quick access' ? 'No shortcuts pinned yet.' : 'No matching tools.'}</p><button onClick={() => {setSearch('');setFilter('All tools');}}>Show all tools</button></div>}
      <div className="mobile-tools-profile"><Link href="/settings" onClick={onClose}><UserAvatar name={name} src={picture}/><span>{name}<small>Profile & preferences</small></span></Link><button onClick={onLogout}>Sign out</button></div>
    </div>
    {editing && <div className="mobile-shortcut-save"><button onClick={savePins}>Save {pins.length} shortcuts</button></div>}
    <MobileNavBar base={accountBase} query={query} pathname={pathname} inMenu onNavigate={onClose} onMenu={onClose} onAI={() => {onClose(); requestAnimationFrame(() => window.dispatchEvent(new Event('open-ai-assistant')));}} />
  </div>;
}

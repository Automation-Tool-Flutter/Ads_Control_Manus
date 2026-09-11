'use client';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdsIcon } from './AdsIcon';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { WORKBENCH_SECTIONS } from './WorkbenchNavigation';
import { MobileNavBar } from './MobileNavBar';
import { MenuAccountPicker } from './MenuAccountPicker';
import { beginMenuNavigation } from '@/lib/menu-navigation';

const SHORT_NAMES: Record<string, string> = {
  '/optimize': 'Performance', '/audiences': 'Audiences', '/budget-optimizer': 'Budgets',
  '/campaign-builder': 'Create campaign', '/campaigns': 'Campaigns', '/optimization-plan': 'Growth plans',
  '/ai-learning': 'Learning', '/catalogs': 'Catalogs', '/ask-ads': 'Meta AI',
};
const QUICK = new Set(['/campaigns', '/actions', '/optimize', '/budget-optimizer']);
const BUILD = new Set(['/campaigns', '/campaign-builder', '/optimization-plan', '/catalogs']);
export function mobileTools(base: string, query: string) {
  return [
    ...WORKBENCH_SECTIONS.flatMap(section => section.items.map(([path, title, icon]) => ({
      id: path || 'overview', label: SHORT_NAMES[path] ?? title, keywords: title + ' ' + section.title,
      icon, href: base ? base + path + query : '/accounts', accountRequired: !base,
      category: BUILD.has(path) ? 'Build' : 'Analyze', quick: QUICK.has(path),
    }))),
  ];
}

const GROUPS = [
  { id: 'Analyze', label: 'Analyze & optimize', icon: 'chart' },
  { id: 'Build', label: 'Create & manage', icon: 'campaign' },
];

export function MobileToolMenu({ accountBase, query, accountName, pathname, name, picture, userId, focusSearch = false, onClose, onLogout }: {
  accountBase: string; query: string; accountName?: string; pathname: string;
  name: string; picture?: string; onClose: () => void; onLogout: () => void;
  userId: string; focusSearch?: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [pins, setPins] = useState<string[]>(Array.from(QUICK));
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [picking, setPicking] = useState<{ path: string; label: string } | null>(null);
  const menuRoot = useRef<HTMLDivElement>(null);
  const savedPins = useRef<string[]>(Array.from(QUICK));
  const searchInput = useRef<HTMLInputElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const tools = mobileTools(accountBase, query);
  const term = search.trim().toLowerCase();
  const visible = tools.filter(tool => (tool.label + ' ' + tool.keywords).toLowerCase().includes(term));
  const shortcuts = pins.map(id => tools.find(tool => tool.id === id)).filter((tool): tool is typeof tools[number] => Boolean(tool));
  const navigate = (href: string) => {
    beginMenuNavigation(href);
    // Release native dialog hit-testing before navigating, including same-route clicks.
    menuRoot.current?.closest('dialog')?.close();
    onClose();
    router.push(href);
  };
  const visitLink = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(href);
  };
  const chooseTool = (tool: typeof tools[number]) => {
    if (tool.accountRequired) setPicking({ path: tool.id === 'overview' ? '' : tool.id, label: tool.label });
    else navigate(tool.href);
  };

  const openAI = () => {
    const dialog = scrollArea.current?.closest('dialog');
    const show = () => window.dispatchEvent(new Event('open-ai-assistant'));
    if (dialog?.open) dialog.addEventListener('close', show, { once: true });
    else requestAnimationFrame(show);
    onClose();
  };
  useEffect(() => {
    let restored = Array.from(QUICK);
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('mobile-tool-pins:' + userId) ?? 'null');
      if (Array.isArray(saved)) restored = Array.from(new Set(saved.filter((id): id is string => typeof id === 'string' && mobileTools('', '').some(tool => tool.id === id)))).slice(0, 6);
    } catch { /* Keep defaults when storage is unavailable. */ }
    savedPins.current = restored; setPins(restored);
  }, [userId]);
  useEffect(() => { scrollArea.current?.scrollTo({ top: 0 }); }, [search, editing]);
  const customize = () => { savedPins.current = [...pins]; setEditing(true); setSearch(''); setMessage('Choose up to 6 shortcuts.'); };
  const cancelEditing = () => { setPins([...savedPins.current]); setEditing(false); setSearch(''); setMessage(''); };
  const togglePin = (id: string) => {
    if (pins.includes(id)) { setPins(pins.filter(pin => pin !== id)); setMessage(''); }
    else if (pins.length < 6) { setPins([...pins, id]); setMessage(''); }
    else setMessage('Unpin one shortcut before adding another.');
  };
  const savePins = () => {
    try {
      localStorage.setItem('mobile-tool-pins:' + userId, JSON.stringify(pins));
      savedPins.current = [...pins]; setEditing(false); setSearch(''); setMessage('Shortcuts saved.');
    } catch { setMessage('Could not save on this device. Try again or cancel.'); }
  };
  const active = (tool: typeof tools[number]) => {
    if (tool.accountRequired) return false;
    const path = tool.href.split('?')[0];
    return pathname === path || (path !== accountBase && path !== '/accounts' && pathname.startsWith(path + '/'));
  };
  const renderTool = (tool: typeof tools[number], shortcut = false) => editing ?
    <button type="button" key={tool.id} onClick={() => togglePin(tool.id)} aria-pressed={pins.includes(tool.id)} aria-label={(pins.includes(tool.id) ? 'Unpin ' : 'Pin ') + tool.label} className="mobile-menu-row mobile-menu-pin">
      <span className="mobile-tool-icon"><AdsIcon name={tool.icon} /></span><strong>{tool.label}</strong><span className="mobile-menu-check" aria-hidden="true">{pins.includes(tool.id) ? '✓' : '+'}</span>
    </button> : tool.accountRequired ?
    <button type="button" key={tool.id} className={shortcut ? 'mobile-menu-shortcut' : 'mobile-menu-row'} onClick={() => chooseTool(tool)}><span className="mobile-tool-icon"><AdsIcon name={tool.icon} /></span><span className="mobile-menu-label"><strong>{tool.label}</strong>{tool.accountRequired && <small>Select account first</small>}</span><span aria-hidden="true">›</span></button> :
    <Link key={tool.id} href={tool.href} onClick={event => visitLink(event, tool.href)} aria-current={active(tool) ? 'page' : undefined} className={shortcut ? 'mobile-menu-shortcut' : 'mobile-menu-row'}>
      <span className="mobile-tool-icon"><AdsIcon name={tool.icon} /></span><span className="mobile-menu-label"><strong>{tool.label}</strong>{tool.accountRequired && <small>Select account first</small>}</span>
      {!shortcut && <span className="mobile-menu-chevron" aria-hidden="true">›</span>}
    </Link>;

  if (picking) return <div ref={menuRoot} className="mobile-tools-shell mobile-menu-organized"><MenuAccountPicker label={picking.label} onCancel={() => setPicking(null)} onSelect={account => {
    const params = new URLSearchParams({ accountName: account.name, name: account.name, currency: account.currency });
    navigate(`/accounts/${encodeURIComponent(account.id)}${picking.path}?${params}`);
  }} /></div>;

  return <div ref={menuRoot} className="mobile-tools-shell mobile-menu-organized" data-editing={editing}>
    <div className="mobile-tools-heading"><h2 id="mobile-tools-title">{editing ? 'Edit shortcuts' : 'Menu'}</h2><button type="button" autoFocus={!focusSearch} onClick={editing ? cancelEditing : onClose} aria-label={editing ? 'Cancel shortcut changes' : 'Close tools'} className="mobile-tools-close"><AdsIcon name="close" /></button></div>
    <div className="mobile-menu-search-area">
      <form role="search" className="mobile-tools-search" onSubmit={event => {
        event.preventDefault();
        // Never guess which tool the user meant when several results match.
        if (!editing && term && visible.length === 1) chooseTool(visible[0]);
        else searchInput.current?.blur();
      }}>
        <AdsIcon name="search" /><input ref={searchInput} autoFocus={focusSearch} type="search" enterKeyHint="search" autoComplete="off" spellCheck={false} aria-label="Search all tools" placeholder="Search tools…" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Escape' && search) { event.preventDefault(); event.stopPropagation(); setSearch(''); } }} />
        {search && <button type="button" onClick={() => { setSearch(''); searchInput.current?.focus(); }} aria-label="Clear search"><AdsIcon name="close" /></button>}
      </form>
    </div>
    <div className="mobile-tools-scroll" ref={scrollArea}>
      {!editing && !term && <>
        <button type="button" onClick={() => setPicking({ path: '', label: 'Account overview' })} className="mobile-tools-account"><span><AdsIcon name="campaign" /></span><div><small>{accountBase ? 'Ad account' : 'Account tools'}</small><strong>{accountName || (accountBase ? 'Account workspace' : 'Choose an ad account')}</strong></div><b>{accountBase ? 'Switch' : 'Choose'} <span aria-hidden="true">›</span></b></button>
        {accountBase && <section aria-labelledby="menu-shortcuts-title">
          <div className="mobile-tools-section-title"><h3 id="menu-shortcuts-title">Shortcuts</h3><button type="button" onClick={customize}>Edit</button></div>
          <nav aria-label="Your shortcuts" className="mobile-menu-shortcuts">{shortcuts.map(tool => renderTool(tool, true))}</nav>
          {!shortcuts.length && <button type="button" className="mobile-menu-add-shortcuts" onClick={customize}>Add your first shortcut</button>}
        </section>}
      </>}
      {message && <p role="status" className="mobile-tools-hint">{message}</p>}
      {editing && <p role="status" className="mobile-tools-hint">{pins.length} of 6 selected · Changes apply when you save.</p>}
      {!accountBase && !term && <p className="mobile-tools-hint">Choose an account to use analysis and campaign tools.</p>}
      {term || editing ? <>
        <p role="status" className="mobile-tools-result">{visible.length} {term ? 'matching tools' : 'tools'}</p>
        <nav aria-label={editing ? 'Choose shortcuts' : 'Search results'} className="mobile-menu-list">{visible.map(tool => renderTool(tool))}</nav>
        {!visible.length && <div className="mobile-tools-empty"><p>No matching tools.</p><button type="button" onClick={() => setSearch('')}>Clear search</button></div>}
      </> : <nav aria-label="All tools" className="mobile-menu-groups">
        {GROUPS.map(group => {
          const items = tools.filter(tool => tool.category === group.id);
          return <section key={group.id} className="mobile-menu-group" aria-labelledby={`menu-group-${group.id}`}>
            <div className="mobile-menu-group-heading"><span className="mobile-tool-icon"><AdsIcon name={group.icon} /></span><h3 id={`menu-group-${group.id}`}>{group.label}</h3><span className="mobile-menu-count">{items.length}</span></div>
            <div className="mobile-menu-list">{items.map(tool => renderTool(tool))}</div>
          </section>;
        })}
      </nav>}
      {!editing && !term && <div className="mobile-tools-profile"><Link href="/settings" onClick={event => visitLink(event, '/settings')}><UserAvatar name={name} src={picture} /><span>{name}<small>Profile & preferences</small></span></Link><button type="button" onClick={onLogout}>Sign out</button></div>}
    </div>
    {editing ? <div className="mobile-menu-edit-actions"><button type="button" onClick={cancelEditing}>Cancel</button><button type="button" onClick={savePins}>Save shortcuts ({pins.length})</button></div> :
      <MobileNavBar base={accountBase} query={query} pathname={pathname} inMenu navigate={navigate} onMenu={onClose} onAI={openAI} />}
  </div>;
}

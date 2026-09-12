'use client';
import Link from 'next/link';
import { lockOverlayScroll } from '@/lib/overlay-scroll';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountDetail } from '@/hooks/useAccountDetail';
import { WorkbenchNavigation, WORKBENCH_SECTIONS } from './WorkbenchNavigation';
import { AdsIcon } from './AdsIcon';
import { MobileToolMenu } from './MobileToolMenu';
import { shouldShowAppBack, useAppBack } from '@/hooks/useAppBack';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';
import { observeMobileViewport } from '@/lib/observe-mobile-viewport';

export function Header() {
  const { state, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { canGoBack, goBack } = useAppBack();
  const [mobile, setMobile] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const { present: menuPresent, closing: menuClosing } = useOverlayPresence(mobile);
  const menuVisible = menuPresent && menuPath === pathname;
  const drawer = useRef<HTMLDialogElement>(null);
  const accountId = pathname.startsWith('/accounts/') ? pathname.split('/')[2] : '';
  const { state: account } = useAccountDetail(accountId, state.token);
  const current = account.status === 'success' && account.data.id === accountId ? account.data : null;
  const query = current ? '?accountName=' + encodeURIComponent(current.name) + '&currency=' + encodeURIComponent(current.currency) : '';
  useEffect(() => { setMobile(false); }, [pathname]);
  useEffect(() => {
    const show = () => { setMenuPath(pathname); setMobile(true); };
    window.addEventListener('open-workspace-menu', show);
    const resize = () => { if (window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches) setMobile(false); };
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('open-workspace-menu', show); window.removeEventListener('resize', resize); };
  }, [pathname]);
  useLayoutEffect(() => {
    const element = drawer.current;
    if (!element) return;
    if (!menuVisible || pathname === '/login') { element.close(); return; }
    const release = lockOverlayScroll();
    const stopViewport = observeMobileViewport(element, '--tools-height', '--tools-top');
    const viewport = window.visualViewport;
    const resize = () => {
      const keyboard = String(Boolean(viewport && Math.abs(viewport.scale - 1) < .01 && window.innerHeight - viewport.height > 140));
      if (element && element.dataset.keyboard !== keyboard) element.dataset.keyboard = keyboard;
    };
    resize(); viewport?.addEventListener('resize', resize);
    // Size before first paint; avoid focusing search or scrolling to a bottom tab.
    element.setAttribute('autofocus', '');
    if (!element.open) element.showModal();
    element.focus({ preventScroll: true });
    return () => {
      release();
      viewport?.removeEventListener('resize', resize);
      stopViewport();
      if (element) delete element.dataset.keyboard;
    };
  }, [menuVisible, pathname]);
  if (pathname === '/login' || (!state.user && pathname !== '/')) return null;
  const close = () => setMobile(false);
  const toggleMenu = () => { setMenuPath(pathname); setMobile(value => !value); };
  const segments = pathname.split('/').filter(Boolean);
  // Post editing/comments have no intermediate /posts or /posts/:id route.
  const parentPath = pathname.startsWith('/pages/') && segments[2] === 'posts'
    ? '/pages/' + segments[1]
    : segments.length > 1 ? '/' + segments.slice(0, -1).join('/') : null;
  const backHref = parentPath && accountId && parentPath !== '/accounts' ? parentPath + query : parentPath;
  const showBack = shouldShowAppBack(pathname, canGoBack, backHref);
  const mobileTitle = accountId
    ? WORKBENCH_SECTIONS.flatMap(section => section.items).find(([path]) => path && pathname === '/accounts/' + accountId + path)?.[1]
      ?? (segments.length > 2 ? 'Account workspace' : 'Account overview')
    : pathname.startsWith('/accounts') ? 'Ad accounts' : pathname.startsWith('/pages') ? 'Page' : pathname.startsWith('/businesses') ? 'Business assets' : pathname.startsWith('/settings') ? 'Settings' : 'Meta Ads AI';
  const navigation = <>
    <div className="ads-brand"><Link href={state.user ? '/accounts' : '/'} onClick={close}><span className="ads-brand-mark"><BrandLogo decorative /></span><span>Meta Ads AI<small>INTELLIGENCE WORKSPACE</small></span></Link><button className="lg:hidden" onClick={close} aria-label="Close menu">✕</button></div>
    {state.user && <><Link href="/accounts" onClick={close} className="ads-account-switch"><span className="ads-account-avatar">{current?.name.charAt(0).toUpperCase() ?? 'W'}</span><span><small>{accountId ? 'AD ACCOUNT' : 'WORKSPACE'}</small><strong>{current?.name ?? (accountId ? 'Account workspace' : 'All ad accounts')}</strong></span><span aria-hidden="true">⌄</span></Link><button className="ads-copilot-entry" onClick={() => {close();window.dispatchEvent(new Event('open-ai-assistant'));}}><BrandLogo size={28} decorative /><span>Meta AI<small>Your next move starts here</small></span><span>↗</span></button></>}
    <nav aria-label="Main navigation" className="ads-sidebar-scroll">
      {accountId && <WorkbenchNavigation accountBase={'/accounts/' + accountId} query={query} onNavigate={close} />}
      <div className="ads-nav-group"><p className="ads-nav-label">{state.user ? 'Workspace' : 'Discover'}</p>{(state.user ? [['/accounts','All accounts','grid'],['/pages','Page','page'],['/businesses','Business assets','audience'],['/settings','Settings','settings']] : [['/','Overview','grid'],['/terms','Terms','plan'],['/privacy','Privacy','settings'],['/contact','Contact','audience']]).map(([href,label,icon]) => <Link key={href} href={href} onClick={close} aria-current={pathname === href ? 'page' : undefined} className={'ads-nav-link ' + (pathname === href ? 'is-active' : '')}><AdsIcon name={icon}/><span>{label}</span></Link>)}</div>
      {!accountId && state.user && <div className="ads-sidebar-note"><AdsIcon name="campaign" /><p>Select an ad account to unlock campaign intelligence, budget tools, and growth plans.</p></div>}
    </nav>
    <div className="ads-sidebar-footer">{state.user ? <><Link href="/settings" onClick={close} className="ads-profile"><UserAvatar name={state.user.name} src={state.user.picture?.data?.url} /><div><strong>{state.user.name}</strong><small>Workspace settings ↗</small></div></Link><button className="ads-signout" onClick={() => {close();logout();router.push('/login');}}>Sign out</button></> : <Link href="/login" className="ads-copilot-entry">Connect your workspace ↗</Link>}</div>
  </>;
  return <><aside className="workspace-sidebar ads-sidebar hidden lg:flex">{navigation}</aside><header className="ads-mobile-header mobile-header-clean lg:hidden">{showBack && <button type="button" className="mobile-back context-back-link" aria-label="Go back to previous page" title="Go back" onClick={() => goBack(backHref || '/accounts')}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m15 5-7 7 7 7"/></svg></button>}<Link href={state.user ? '/accounts' : '/'} className="mobile-header-title" aria-label={mobileTitle + ' — return to accounts'}>{!showBack && <span className="mobile-header-mark" aria-hidden="true"><BrandLogo size={32} decorative /></span>}<span className="mobile-header-title-text">{mobileTitle}</span></Link>{state.user && <Link href="/settings" className="mobile-header-profile" aria-label="Open profile settings"><UserAvatar name={state.user.name} src={state.user.picture?.data?.url} /></Link>}</header><dialog id="workspace-menu" ref={drawer} tabIndex={-1} data-closing={menuClosing} onCancel={event => { event.preventDefault(); close(); }} onClose={event => { if (!event.currentTarget.open) close(); }} aria-label="Workspace navigation" className={state.user ? "mobile-tools-dialog" : "ads-mobile-drawer"}>{state.user ? <MobileToolMenu key={state.user.id + ':' + pathname} accountBase={accountId ? '/accounts/' + accountId : ''} query={query} accountName={current?.name} pathname={pathname} userId={state.user.id} name={state.user.name} picture={state.user.picture?.data?.url} onClose={close} onToggleMenu={toggleMenu} onLogout={() => {close();logout();router.push('/login');}} /> : <div className="ads-sidebar">{navigation}</div>}</dialog></>;
}

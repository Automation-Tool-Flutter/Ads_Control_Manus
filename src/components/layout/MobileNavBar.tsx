'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { AdsIcon } from './AdsIcon';

/** Shared by the page and the modal menu so primary actions never disappear. */
export function MobileNavBar({ base, query, pathname, inMenu = false, onNavigate, onMenu, onAI }: {
  base: string; query: string; pathname: string; inMenu?: boolean;
  onNavigate?: () => void; onMenu: () => void; onAI: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [destination, setDestination] = useState('');
  const links = [
    { href: base ? base + query : '/accounts', path: base || '/accounts', label: 'Home', icon: 'grid', exact: true },
    { href: base ? base + '/campaigns' + query : '/businesses', path: base ? base + '/campaigns' : '/businesses', label: base ? 'Campaigns' : 'Assets', icon: base ? 'campaign' : 'audience', exact: false },
    { href: '/pages', path: '/pages', label: 'Page', icon: 'page', exact: false },
  ];
  const item = (link: typeof links[number]) => {
    const active = !inMenu && (pathname === link.path || (!link.exact && pathname.startsWith(link.path + '/')));
    return <Link key={link.label} href={link.href} onClick={event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      onNavigate?.();
      if (pathname === link.path) return;
      setDestination(link.href);
      startTransition(() => router.push(link.href));
    }} aria-busy={pending && destination === link.href || undefined} aria-current={active ? 'page' : undefined} className={'mobile-tab ' + (active ? 'is-active' : '')}><AdsIcon name={link.icon}/><span>{link.label}</span></Link>;
  };
  return <nav aria-label={inMenu ? 'Menu primary navigation' : 'Mobile primary navigation'} className={inMenu ? 'mobile-tools-tabbar' : 'ads-bottom-nav lg:hidden'}>
    <span className="sr-only" role="status">{pending ? "Opening page…" : ""}</span>{item(links[0])}{item(links[1])}
    <button type="button" className="mobile-tab mobile-tab-ai" onClick={onAI} aria-label="Open Meta AI"><span className="mobile-ai-icon"><BrandLogo size={32} decorative /></span><span>Meta AI</span></button>
    {item(links[2])}
    <button type="button" className={'mobile-tab ' + (inMenu ? 'is-active' : '')} onClick={onMenu} aria-label={inMenu ? 'Close all tools' : 'Open all tools'} aria-expanded={inMenu} aria-controls="workspace-menu"><AdsIcon name={inMenu ? 'close' : 'menu'}/><span>{inMenu ? 'Close' : 'Menu'}</span></button>
  </nav>;
}

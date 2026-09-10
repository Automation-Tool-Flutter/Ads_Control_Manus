'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdsIcon } from './AdsIcon';
export const WORKBENCH_SECTIONS = [
  { title: 'Command center', items: [['', 'Overview', 'grid'], ['/ask-ads', 'AI Analyst', 'ai'], ['/actions', 'Action inbox', 'plan']] },
  { title: 'Analyze & optimize', items: [['/optimize', 'Performance intelligence', 'chart'], ['/audiences', 'Audience insights', 'audience'], ['/budget-optimizer', 'Budget studio', 'budget'], ['/alerts', 'Diagnostics', 'alert']] },
  { title: 'Build & manage', items: [['/campaigns', 'Campaign manager', 'campaign'], ['/campaign-builder', 'AI Campaign Builder', 'ai'], ['/optimization-plan', 'Growth plans', 'plan']] },
  { title: 'Measure & learn', items: [['/ai-learning', 'Learning hub', 'learning'], ['/catalogs', 'Product catalogs', 'content']] },
];
export function WorkbenchNavigation({ accountBase, query, onNavigate }: { accountBase: string; query: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return <div className="ads-workbench">{WORKBENCH_SECTIONS.map(section => <details key={section.title} open className="ads-nav-group"><summary>{section.title}<span aria-hidden="true">⌄</span></summary><div>{section.items.map(([path,label,icon]) => {
    const active = path ? pathname === accountBase + path || pathname.startsWith(accountBase + path + '/') : pathname === accountBase;
    return <Link key={path} onClick={onNavigate} aria-current={active ? 'page' : undefined} href={accountBase + path + query} className={'ads-nav-link ' + (active ? 'is-active' : '')}><AdsIcon name={icon} /><span>{label}</span>{icon === 'ai' && <small>AI</small>}</Link>;
  })}</div></details>)}</div>;
}

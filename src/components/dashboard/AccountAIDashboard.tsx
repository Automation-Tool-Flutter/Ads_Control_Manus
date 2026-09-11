'use client';
import { useEffect, useState } from 'react';
import { ActionCenter } from './ActionCenter';
import { MobileAIEntry } from './MobileAIEntry';
import { downloadCsv } from '@/lib/report-export';
import { usePublishAIView } from '@/hooks/useAIViewContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDailyInsights } from '@/hooks/useDailyInsights';
import { useCampaigns } from '@/hooks/useCampaigns';
import { CampaignChart } from '@/components/ui/CampaignChart';
import { DateFilter } from '@/components/ui/DateFilter';
import { useViewState } from '@/hooks/useViewState';
import { getLearningRecords } from '@/lib/learning-store';
import { deriveCampaignKpis, formatKpi } from '@/lib/campaign-kpis';
import { formatSpend } from '@/lib/utils';
import type { DatePreset } from '@/lib/types';

const FEATURES = [
  ['optimize', 'Analysis and recommendations', 'Find optimization opportunities by objective.'],
  ['budget-optimizer', 'Budget optimization', 'Simulate allocations before applying changes.'],
  ['audiences', 'Audience Intelligence', 'Explore audience segments and saturation.'],
  ['campaign-builder', 'AI Campaign Builder', 'Turn a brief into a structured campaign draft.'],
  ['alerts', 'Alert Center', 'Investigate anomalies and possible causes.'],
  ['optimization-plan', 'Action plan', 'Build a 7- or 14-day optimization cycle.'],
] as const;

export function AccountAIDashboard(props: { accountId: string; name: string; currency: string; token: string }) {
  const [period, setPeriod] = useViewState<DatePreset>('period', 'last_30d');
  usePublishAIView(period);
  return <div className="ai-dashboard space-y-6"><header className="mobile-dashboard-header flex flex-wrap items-center justify-between gap-4"><div className="min-w-0"><p className="text-sm text-text-secondary">{props.name}</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">Performance overview</h1></div><DateFilter value={period} onChange={value => { if (typeof value === 'string') setPeriod(value); }} allowCustom={false} presets={[{ value: 'last_7d', label: 'Last 7 days' }, { value: 'last_14d', label: 'Last 14 days' }, { value: 'last_30d', label: 'Last 30 days' }]} /></header><DashboardPeriod key={`${props.accountId}:${period}`} {...props} period={period} /></div>;
}

function DashboardPeriod({ accountId, name, currency, token, period }: { accountId: string; name: string; currency: string; token: string; period: DatePreset }) {
  const router = useRouter();
  const daily = useDailyInsights(accountId, period, 'account', token);
  const campaigns = useCampaigns(accountId, token, period);
  const [question, setQuestion] = useState('');
  const [learning, setLearning] = useState({ accepted: 0, measured: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const query = `accountName=${encodeURIComponent(name)}&currency=${encodeURIComponent(currency)}`;
  const href = (path: string) => `/accounts/${accountId}/${path}?${query}`;
  useEffect(() => {
    const update = () => { const records = getLearningRecords(accountId).filter(r => r.accepted); setLearning({ accepted: records.length, measured: records.filter(r => r.checkpoints?.length).length }); };
    update(); window.addEventListener('ai-learning-updated', update); window.addEventListener('storage', update);
    return () => { window.removeEventListener('ai-learning-updated', update); window.removeEventListener('storage', update); };
  }, [accountId]);
  const totals = daily.aggregateState.status === 'success' ? daily.aggregateState.data : null;
  const rows = campaigns.state.status === 'success' ? campaigns.state.data : [];
  const ranked = [...rows].sort((a, b) => Number(campaigns.insights[b.id]?.spend ?? 0) - Number(campaigns.insights[a.id]?.spend ?? 0)).slice(0, 5);
  const loading = daily.state.status === 'idle' || daily.state.status === 'loading';
  const refresh = async () => { setRefreshing(true); try { await Promise.all([daily.retry(), campaigns.retry()]); } finally { setRefreshing(false); } };
  return <>
    <div className="dashboard-ai-entry">
      <MobileAIEntry chatHref={`${href('ask-ads')}&days=${period === 'last_7d' ? 7 : period === 'last_14d' ? 14 : 30}`} />
    <section className="ai-command ads-intelligence-hero p-6 text-white sm:p-8"><div className="max-w-3xl"><p className="text-[11px] font-semibold tracking-[0.2em] text-indigo-200">Meta Ads AI / YOUR STRATEGY PARTNER</p><h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Turn your ad data into your next advantage.</h2><p className="mt-3 text-sm leading-6 text-indigo-100">Explore advertising performance, investigate changes, and plan your next optimization with AI.</p><form onSubmit={e => { e.preventDefault(); if (question.trim()) router.push(`${href('ask-ads')}&question=${encodeURIComponent(question.trim())}`); }} className="mt-6 flex flex-col gap-2 rounded-2xl border border-white/25 bg-white/10 p-2 sm:flex-row"><input aria-label="Question for AI" maxLength={2000} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Which campaigns are wasting budget?" className="min-w-0 flex-1 rounded-xl bg-transparent px-3 py-3 text-sm text-white placeholder:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50" /><button disabled={!question.trim()} className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 disabled:opacity-50">Ask AI ↗</button></form><div className="mt-4 flex flex-wrap gap-2">{['Why is advertising performance declining?', 'Build a seven-day optimization plan'].map(text => <button key={text} onClick={() => setQuestion(text)} className="rounded-full border border-white/20 px-3 py-2 text-xs text-indigo-100 hover:bg-white/10">{text}</button>)}<Link href={href('optimize')} className="px-3 py-2 text-xs font-bold">Open AI analysis →</Link></div></div><aside className="ads-hero-aside"><p>FROM INSIGHT TO IMPACT</p><Link href={href('optimize')}><span>01</span> Understand performance <b>↗</b></Link><Link href={href('budget-optimizer')}><span>02</span> Optimize investment <b>↗</b></Link><Link href={href('campaign-builder')}><span>03</span> Build your next campaign <b>↗</b></Link></aside></section>
    </div>
    <ActionCenter accountId={accountId} compact />
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-text-muted">Period performance · Meta Insights</p><div className="flex gap-2"><button disabled={campaigns.state.status !== 'success'} onClick={() => downloadCsv('campaign-performance.csv', [['Campaign ID','Campaign','Objective','Status','Currency','Spend','Impressions','Clicks','CTR'], ...rows.map(row => { const insight = campaigns.insights[row.id]; return [row.id,row.name,row.objective,row.status,currency,insight?.spend,insight?.impressions,insight?.clicks,insight?.ctr]; })])} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-secondary disabled:opacity-40">Export CSV</button><button onClick={refresh} disabled={refreshing || loading} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-secondary disabled:opacity-50">{refreshing ? 'Loading…' : 'Refresh data'}</button></div></div>
    {daily.state.status === 'error' && <p role="alert" className="rounded-xl bg-status-red/10 p-4 text-sm text-status-red">Unable to load performance: {daily.state.error}</p>}
    <section aria-label="Performance metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[
      ['Total spend', totals ? formatSpend(totals.spend ?? '0', currency) : '—', 'Spend in the selected period'],
      ['Impressions', totals ? Number(totals.impressions ?? 0).toLocaleString('en-US') : '—', 'Total ad impressions'],
      ['Clicks', totals ? Number(totals.clicks ?? 0).toLocaleString('en-US') : '—', 'All clicks reported by Meta'],
      ['Click-through rate', totals?.ctr ? `${Number(totals.ctr).toFixed(2)}%` : '—', 'Clicks divided by impressions'],
    ].map(([label, value, detail]) => <article key={label} className="ai-surface ads-metric-card p-4 sm:p-5"><p className="text-xs font-semibold text-text-secondary">{label}</p><p className="mt-4 break-words text-xl font-bold tracking-tight text-text-primary sm:text-2xl">{loading ? '…' : value}</p><p className="mt-2 text-[11px] text-text-muted">{detail}</p></article>)}</section>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"><section className="ai-surface min-w-0 p-5"><h2 className="mb-1 font-bold text-text-primary">Performance trends</h2><p className="mb-5 text-xs text-text-muted">Daily data · {currency}</p>{daily.state.status === 'error' ? <p className="py-16 text-center text-sm text-text-muted">Chart unavailable.</p> : daily.state.status === 'success' && !daily.state.data.length ? <p className="py-16 text-center text-sm text-text-muted">No data for this period.</p> : <CampaignChart data={daily.state.status === 'success' ? daily.state.data : []} currency={currency} loading={loading} dateFilter={period} />}</section><aside className="ai-surface p-5"><p className="text-[10px] font-bold tracking-widest text-accent">CONTINUOUS LEARNING</p><h2 className="mt-2 text-lg font-bold text-text-primary">Optimization feedback loop</h2><p className="mt-3 text-sm leading-6 text-text-secondary">Apply recommendations, evaluate outcomes, and develop account-specific guidance.</p><div className="mt-5 grid grid-cols-2 gap-3">{[[learning.accepted, 'Accepted'], [learning.measured, 'Evaluated']].map(([value, label]) => <div key={label} className="rounded-xl bg-accent/5 p-3"><p className="text-2xl font-bold text-text-primary">{value}</p><p className="mt-1 text-[10px] text-text-muted">{label}</p></div>)}</div><Link href={href('ai-learning')} className="mt-5 block rounded-xl border border-accent/20 bg-accent/5 py-3 text-center text-xs font-bold text-accent">Open Learning Center →</Link><p className="mt-3 text-[10px] leading-4 text-text-muted">Browser history across all dates, independent of the dashboard filter.</p></aside></div>
    <section className="ai-surface overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-2 p-5"><div><h2 className="font-bold text-text-primary">Campaigns by spend</h2><p className="mt-1 text-xs text-text-muted">Top five loaded campaigns · Objective-specific KPIs</p></div><Link href={href('campaigns')} className="text-xs font-bold text-accent">View campaigns →</Link></div>{campaigns.state.status === 'error' ? <p role="alert" className="p-5 text-sm text-status-red">{campaigns.state.error}</p> : campaigns.state.status !== 'success' ? <p className="p-8 text-sm text-text-muted">Loading campaigns…</p> : !ranked.length ? <p className="p-8 text-sm text-text-muted">No campaigns found. Start with AI Campaign Builder below.</p> : <><div className="mobile-campaign-list divide-y divide-border">{ranked.map(c => { const insight = campaigns.insights[c.id]; const kpi = deriveCampaignKpis(c.objective, insight).primary; return <Link key={c.id} href={href(`campaigns/${c.id}`)} className="block min-w-0 p-4 active:bg-bg-secondary"><div className="flex items-start justify-between gap-3"><h3 className="min-w-0 text-sm font-semibold leading-5 text-text-primary">{c.name}</h3><span className="shrink-0 text-accent" aria-hidden="true">→</span></div><p className="mt-2 text-xs text-text-secondary">{c.status} · {c.objective}</p><dl className="mt-3 grid grid-cols-2 gap-3"><div className="min-w-0"><dt className="text-xs text-text-muted">Spend</dt><dd className="mt-1 text-base font-semibold tabular-nums text-text-primary">{formatSpend(insight?.spend, currency)}</dd></div><div className="min-w-0"><dt className="text-xs text-text-muted">{kpi.label}</dt><dd className="mt-1 text-base font-semibold tabular-nums text-text-primary">{formatKpi(kpi, currency)}</dd></div></dl></Link>; })}</div><div className="desktop-campaign-table overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-bg-secondary/50 text-[10px] uppercase tracking-wider text-text-muted"><tr>{['Campaign', 'Spend', 'Primary KPI', 'Status'].map(t => <th key={t} className="px-5 py-3">{t}</th>)}</tr></thead><tbody>{ranked.map(c => { const insight = campaigns.insights[c.id]; const kpi = deriveCampaignKpis(c.objective, insight).primary; return <tr key={c.id} className="border-t border-border/60"><td className="max-w-[300px] px-5 py-4"><Link href={href(`campaigns/${c.id}`)} className="line-clamp-2 font-semibold text-text-primary hover:text-accent">{c.name}</Link><p className="mt-1 text-[10px] text-text-muted">{c.objective}</p></td><td className="px-5 py-4 text-text-primary">{formatSpend(insight?.spend, currency)}</td><td className="px-5 py-4 text-text-primary">{formatKpi(kpi, currency)}<p className="text-[10px] text-text-muted">{kpi.label}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${c.status === 'ACTIVE' ? 'bg-status-green/10 text-status-green' : 'bg-bg-secondary text-text-secondary'}`}>{c.status}</span></td></tr>; })}</tbody></table></div></>}</section>
    <section><h2 className="mb-4 text-lg font-bold text-text-primary">Your AI toolkit</h2><div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{FEATURES.map(([path, title, description], i) => <Link key={path} href={href(path)} className="ai-surface ads-capability group flex gap-4 p-5 transition-colors hover:border-accent/50"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 font-mono text-xs font-bold text-accent">0{i + 1}</span><div><h3 className="text-sm font-bold text-text-primary group-hover:text-accent">{title} ↗</h3><p className="mt-2 text-xs leading-5 text-text-secondary">{description}</p></div></Link>)}</div></section>
  </>;
}

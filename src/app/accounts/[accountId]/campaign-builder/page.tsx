'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCampaignBuilder } from '@/hooks/useCampaignBuilder';
import { useCatalogs } from '@/hooks/useCatalogs';
import { PageContainer } from '@/components/layout/PageContainer';
import { ControlHeader } from '@/components/layout/ControlHeader';
import { formatCurrency } from '@/lib/utils';
import type { CampaignBuilderInput, CampaignBusinessGoal } from '@/lib/types/campaign-builder';

const GOALS: Array<{ value: CampaignBusinessGoal; label: string; kpi: string }> = [
  { value: 'sales', label: 'Sales', kpi: 'ROAS / Purchase' },
  { value: 'leads', label: 'Leads', kpi: 'CPL / Lead' },
  { value: 'traffic', label: 'Traffic', kpi: 'CPC / Link click' },
  { value: 'engagement', label: 'Engagement', kpi: 'Cost per engagement' },
  { value: 'video', label: 'Video views', kpi: 'Cost per ThruPlay' },
  { value: 'awareness', label: 'Awareness', kpi: 'Reach / CPM' },
];

const fieldClass = 'mt-1.5 w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent';
const labelClass = 'text-xs font-bold text-text-secondary';

export default function CampaignBuilderPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const { accountId } = useParams<{ accountId: string }>();
  const searchParams = useSearchParams();
  const accountName = searchParams.get('accountName') ?? accountId;
  const currency = searchParams.get('currency') ?? 'USD';
  const catalogs = useCatalogs(accountId, auth.token);
  const builder = useCampaignBuilder(accountId, auth.token);
  const [confirmed, setConfirmed] = useState(false);
  const [input, setInput] = useState<CampaignBuilderInput>({
    accountId, accountName, currency, productName: '', catalogId: '', catalogName: '', websiteUrl: '',
    businessGoal: 'sales', totalBudget: '', marketCountries: ['VN'], customerPersona: '', durationDays: 14,
    kpiMetric: 'ROAS / Purchase', kpiTarget: '', numberOfAdSets: 2, namingPrefix: '', pageId: '', postId: '', pixelId: '',
  });

  useEffect(() => { if (!auth.isLoading && !auth.token) router.replace('/login'); }, [auth.isLoading, auth.token, router]);
  const requiredBlocked = useMemo(() => input.businessGoal === 'sales' && !input.pixelId.trim() || ['leads', 'engagement'].includes(input.businessGoal) && !input.pageId.trim(), [input]);
  const update = <K extends keyof CampaignBuilderInput>(key: K, value: CampaignBuilderInput[K]) => {
    setInput(previous => ({ ...previous, [key]: value }));
    if (builder.state.status !== 'idle') builder.reset();
    setConfirmed(false);
  };
  const submit = (event: FormEvent) => { event.preventDefault(); setConfirmed(false); builder.generate(input); };
  if (auth.isLoading) return null;

  return (
    <PageContainer>
      <ControlHeader
        breadcrumbs={[{ label: 'Accounts', href: '/accounts' }, { label: accountName, href: `/accounts/${accountId}` }, { label: 'AI Campaign Builder' }]}
        eyebrow="Campaign creation workspace"
        title="AI Campaign Builder"
        description="Turn a business brief into a campaign structure, budget allocation, audience strategy, creative brief, and test plan before creating anything on Meta."
        badge="Draft → Review → PAUSED"
        stats={builder.state.status === 'success' ? [
          { label: 'confidence', value: `${builder.state.draft.confidence}%`, tone: 'blue' },
          { label: 'ad sets', value: builder.state.draft.adSets.length, tone: 'green' },
          { label: 'ad concepts', value: builder.state.draft.ads.length, tone: 'neutral' },
        ] : []}
      />

      <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <form onSubmit={submit} className="h-fit space-y-5 rounded-xl border border-border bg-bg-card p-5 xl:sticky xl:top-4">
          <div><p className="text-[10px] font-black uppercase text-accent">1. Business brief</p><h2 className="text-lg font-bold text-text-primary">Campaign brief</h2></div>
          <div><label className={labelClass}>Product or service {!input.catalogId && '*'}</label><input required={!input.catalogId} value={input.productName} onChange={e => update('productName', e.target.value)} className={fieldClass} placeholder="For example: Online language courses" /></div>
          <div><label className={labelClass}>Catalog (optional)</label><select value={input.catalogId} onChange={e => { const catalog = catalogs.state.status === 'success' ? catalogs.state.data.find(item => item.id === e.target.value) : undefined; update('catalogId', e.target.value); update('catalogName', catalog?.name ?? ''); }} className={fieldClass}><option value="">No catalog</option>{catalogs.state.status === 'success' && catalogs.state.data.map(catalog => <option key={catalog.id} value={catalog.id}>{catalog.name} ({catalog.product_count ?? 0})</option>)}</select></div>
          <div><label className={labelClass}>Business objective *</label><select value={input.businessGoal} onChange={e => { const businessGoal = e.target.value as CampaignBusinessGoal; update('businessGoal', businessGoal); update('kpiMetric', GOALS.find(goal => goal.value === businessGoal)?.kpi ?? ''); }} className={fieldClass}>{GOALS.map(goal => <option key={goal.value} value={goal.value}>{goal.label}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={labelClass}>Total budget ({currency}) *</label><input required min="1" type="number" value={input.totalBudget} onChange={e => update('totalBudget', e.target.value)} className={fieldClass} /></div><div><label className={labelClass}>Duration in days *</label><input required min="2" max="180" type="number" value={input.durationDays} onChange={e => update('durationDays', Number(e.target.value))} className={fieldClass} /></div></div>
          <div><label className={labelClass}>Markets (country codes) *</label><input required value={input.marketCountries.join(', ')} onChange={e => update('marketCountries', e.target.value.toUpperCase().split(',').map(item => item.trim()).filter(Boolean))} className={fieldClass} placeholder="VN, SG" /><p className="mt-1 text-[10px] text-text-muted">Use two-letter ISO country codes, separated by commas.</p></div>
          <div><label className={labelClass}>Customer profile *</label><textarea required rows={3} value={input.customerPersona} onChange={e => update('customerPersona', e.target.value)} className={fieldClass} placeholder="Age, needs, behaviors, and purchase barriers…" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={labelClass}>Target KPI</label><input value={input.kpiMetric} onChange={e => update('kpiMetric', e.target.value)} className={fieldClass} /></div><div><label className={labelClass}>KPI target</label><input value={input.kpiTarget} onChange={e => update('kpiTarget', e.target.value)} className={fieldClass} placeholder="For example: ≥ 3.0" /></div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={labelClass}>Number of ad sets</label><select value={input.numberOfAdSets} onChange={e => update('numberOfAdSets', Number(e.target.value))} className={fieldClass}>{[1, 2, 3, 4, 5].map(value => <option key={value}>{value}</option>)}</select></div><div><label className={labelClass}>Naming prefix</label><input value={input.namingPrefix} onChange={e => update('namingPrefix', e.target.value)} className={fieldClass} placeholder="Q4_VN" /></div></div>
          <details className="rounded-lg border border-border bg-bg-secondary/40 p-3"><summary className="cursor-pointer text-xs font-bold text-text-primary">Meta creation settings</summary><div className="mt-3 space-y-3"><div><label className={labelClass}>Website URL</label><input type="url" value={input.websiteUrl} onChange={e => update('websiteUrl', e.target.value)} className={fieldClass} /></div><div><label className={labelClass}>Pixel ID {input.businessGoal === 'sales' && '*'}</label><input value={input.pixelId} onChange={e => update('pixelId', e.target.value.trim())} className={fieldClass} /></div><div><label className={labelClass}>Page ID {['leads', 'engagement'].includes(input.businessGoal) && '*'}</label><input value={input.pageId} onChange={e => update('pageId', e.target.value.trim())} className={fieldClass} /></div><div><label className={labelClass}>Existing Post ID</label><input value={input.postId} onChange={e => update('postId', e.target.value.trim())} className={fieldClass} /><p className="mt-1 text-[10px] text-text-muted">Provide a Page ID and Post ID to create ads from an existing post. Otherwise, only the campaign and ad sets are created.</p></div></div></details>
          <button disabled={builder.state.status === 'generating'} className="meta-action meta-action-primary w-full disabled:opacity-50">{builder.state.status === 'generating' ? 'AI is building your plan…' : builder.state.status === 'success' ? 'Regenerate draft' : 'Generate campaign draft'}</button>
          {builder.state.status === 'error' && <p className="rounded-lg border border-status-red/30 bg-status-red/10 p-3 text-xs text-status-red">{builder.state.error}</p>}
        </form>

        <main className="min-w-0 space-y-5">
          {builder.state.status === 'idle' && <div className="rounded-xl border border-dashed border-border bg-bg-card p-10 text-center"><p className="font-bold text-text-primary">Start with a clear brief</p><p className="mx-auto mt-2 max-w-xl text-sm text-text-secondary">AI recommends the structure. The application recalculates budgets and validates the objective and optimization goal against your chosen business outcome.</p></div>}
          {builder.state.status === 'generating' && <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-xl border border-border bg-bg-card" />)}</div>}
          {builder.state.status === 'success' && (() => { const draft = builder.state.draft; return <>
            <section className="rounded-xl border border-accent/30 bg-accent/5 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase text-accent">2. AI strategy draft</p><h2 className="mt-1 text-xl font-black text-text-primary">{draft.campaign.name}</h2></div><span className="rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-white">{draft.campaign.objective}</span></div><p className="mt-3 text-sm text-text-secondary">{draft.summary}</p><p className="mt-2 text-xs text-text-muted">{draft.campaign.rationale}</p><div className="mt-4 grid grid-cols-3 gap-2"><div className="meta-metric"><p className="text-[10px] uppercase text-text-muted">Total budget</p><p className="font-bold text-text-primary">{formatCurrency(draft.campaign.totalBudgetRaw, currency)}</p></div><div className="meta-metric"><p className="text-[10px] uppercase text-text-muted">Duration</p><p className="font-bold text-text-primary">{draft.campaign.durationDays} days</p></div><div className="meta-metric"><p className="text-[10px] uppercase text-text-muted">Confidence</p><p className="font-bold text-accent">{draft.confidence}%</p></div></div></section>

            <section><div className="mb-3"><p className="text-[10px] font-black uppercase text-accent">Campaign structure</p><h2 className="text-lg font-bold text-text-primary">Ad sets and budget allocation</h2></div><div className="grid gap-3 lg:grid-cols-2">{draft.adSets.map(adSet => <article key={adSet.draftId} className="rounded-xl border border-border bg-bg-card p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-bold text-text-primary">{adSet.name}</h3><span className="rounded-md bg-status-green/10 px-2 py-1 text-xs font-black text-status-green">{adSet.budgetSharePercent}% · {formatCurrency(adSet.lifetimeBudgetRaw, currency)}</span></div><div className="mt-3 flex flex-wrap gap-1.5">{adSet.targeting.countries.map(country => <span key={country} className="rounded bg-bg-secondary px-2 py-1 text-[10px] font-bold text-text-secondary">{country}</span>)}<span className="rounded bg-bg-secondary px-2 py-1 text-[10px] text-text-secondary">{adSet.targeting.ageMin}–{adSet.targeting.ageMax}</span>{adSet.placements.map(item => <span key={item} className="rounded bg-bg-secondary px-2 py-1 text-[10px] text-text-secondary">{item.replaceAll('_', ' ')}</span>)}</div><p className="mt-3 text-sm text-text-secondary">{adSet.rationale}</p><p className="mt-2 text-xs font-semibold text-accent">{adSet.optimizationGoal} · {adSet.bidStrategy}</p>{adSet.targeting.interests.length > 0 && <p className="mt-2 text-xs text-text-muted">Interest hypotheses: {adSet.targeting.interests.join(', ')}</p>}</article>)}</div></section>

            <section><div className="mb-3"><p className="text-[10px] font-black uppercase text-accent">Creative direction</p><h2 className="text-lg font-bold text-text-primary">Ad concepts</h2></div><div className="space-y-3">{draft.ads.map(ad => <article key={ad.draftId} className="rounded-xl border border-border bg-bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-bold text-text-primary">{ad.name}</h3><span className="text-[10px] font-black uppercase text-accent">{ad.format} · {ad.cta}</span></div><p className="mt-3 text-sm font-semibold text-text-primary">{ad.headline}</p><p className="mt-1 text-sm text-text-secondary">{ad.primaryText}</p><p className="mt-3 rounded-lg bg-bg-secondary/60 p-3 text-xs text-text-muted">Creative brief: {ad.creativeBrief}</p></article>)}</div></section>

            <section className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-border bg-bg-card p-4"><h2 className="font-bold text-text-primary">Test plan</h2><ol className="mt-3 space-y-3">{draft.testPlan.map((item, index) => <li key={`${item.day}-${index}`} className="flex gap-3 text-sm"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-black text-accent">D{item.day}</span><div><p className="font-semibold text-text-primary">{item.action}</p><p className="text-xs text-text-secondary">{item.successMetric} · {item.decisionRule}</p></div></li>)}</ol></div><div className="rounded-xl border border-border bg-bg-card p-4"><h2 className="font-bold text-text-primary">Risks to review</h2><ul className="mt-3 space-y-2">{draft.risks.map((risk, index) => <li key={index} className="text-sm text-text-secondary">• {risk}</li>)}</ul></div></section>

            <section className="rounded-xl border border-border bg-bg-card p-5"><div><p className="text-[10px] font-black uppercase text-accent">3. Review & create</p><h2 className="text-lg font-bold text-text-primary">Preflight Meta</h2></div><div className="mt-4 space-y-2">{draft.preflightChecks.map(check => <div key={check.label} className="flex items-start gap-3 rounded-lg bg-bg-secondary/50 p-3"><span className={`mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${check.status === 'pass' ? 'bg-status-green/10 text-status-green' : check.status === 'required' ? 'bg-status-red/10 text-status-red' : 'bg-status-yellow/10 text-status-yellow'}`}>{check.status}</span><div><p className="text-sm font-bold text-text-primary">{check.label}</p><p className="text-xs text-text-secondary">{check.detail}</p></div></div>)}</div><label className="mt-4 flex items-start gap-2 text-sm text-text-secondary"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1" /><span>I have reviewed the objective, budget, and targeting. I understand these entities will be created with status <strong>PAUSED</strong>.</span></label><button type="button" onClick={() => builder.create(input, draft)} disabled={!confirmed || requiredBlocked || builder.createState.status === 'creating' || builder.createState.status === 'success'} className="meta-action meta-action-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-40">{builder.createState.status === 'creating' ? 'Creating on Meta…' : builder.createState.status === 'success' ? 'Paused campaign created' : requiredBlocked ? 'Complete required Meta fields' : 'Create paused campaign on Meta'}</button>
              {builder.createState.status === 'success' && <div className="mt-4 rounded-lg border border-status-green/30 bg-status-green/10 p-4 text-sm text-status-green"><p className="font-bold">Created successfully. Delivery has not started.</p><p className="mt-1">Campaign: {builder.createState.result.campaignId} · {builder.createState.result.adSetIds.length} ad set · {builder.createState.result.adIds.length} ad.</p>{builder.createState.result.skippedAds && <p className="mt-1">Ad creation was skipped because the Page ID or Post ID is missing.</p>}<Link className="mt-3 inline-block font-bold underline" href={`/accounts/${accountId}/campaigns?accountName=${encodeURIComponent(accountName)}&currency=${currency}`}>Open campaigns</Link></div>}
              {builder.createState.status === 'error' && <div className="mt-4 rounded-lg border border-status-red/30 bg-status-red/10 p-4 text-sm text-status-red"><p className="font-bold">Creation incomplete</p><p className="mt-1">{builder.createState.error}</p>{builder.createState.partial?.campaignId && <p className="mt-2 text-xs">Created: campaign {builder.createState.partial.campaignId}, {builder.createState.partial.adSetIds.length} ad set, {builder.createState.partial.adIds.length} ad.</p>}</div>}
            </section>
          </>; })()}
        </main>
      </div>
    </PageContainer>
  );
}

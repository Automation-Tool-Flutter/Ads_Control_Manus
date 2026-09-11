'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAudienceIntelligence } from '@/hooks/useAudienceIntelligence';
import { PageContainer } from '@/components/layout/PageContainer';
import { LoadingState } from '@/components/ui/LoadingState';
import { ControlHeader } from '@/components/layout/ControlHeader';
import { ErrorState } from '@/components/ui/ErrorState';

const SATURATION_STYLE = {
  healthy: 'border-status-green/30 bg-status-green/10 text-status-green',
  watch: 'border-status-yellow/30 bg-status-yellow/10 text-status-yellow',
  saturated: 'border-status-red/30 bg-status-red/10 text-status-red',
  insufficient_data: 'border-border bg-bg-secondary text-text-muted',
};

export default function AudienceIntelligencePage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const { accountId } = useParams<{ accountId: string }>();
  const searchParams = useSearchParams();
  const accountName = searchParams.get('accountName') ?? accountId;
  const currency = searchParams.get('currency') ?? 'USD';
  const { state, analyze } = useAudienceIntelligence(accountId, auth.token, currency);

  useEffect(() => { if (!auth.isLoading && !auth.token) router.replace('/login'); }, [auth.isLoading, auth.token, router]);
  if (auth.isLoading) return null;

  return (
    <PageContainer>
      <ControlHeader
        breadcrumbs={[{ label: 'Accounts', href: '/accounts' }, { label: accountName, href: `/accounts/${accountId}` }, { label: 'Audience Intelligence' }]}
        eyebrow="Targeting intelligence"
        title="AI Audience Intelligence"
        description="Compare audience segments, verify shared targeting, detect saturation signals, and build an evidence-based audience brief."
        badge="30-day breakdown"
        stats={state.status === 'success' ? [
          { label: 'confidence', value: `${state.analysis.confidence}%`, tone: 'blue' },
          { label: 'top segments', value: state.analysis.topSegments.length, tone: 'green' },
          { label: 'overlap risks', value: state.analysis.overlapRisks.length, tone: state.analysis.overlapRisks.length ? 'amber' : 'neutral' },
        ] : []}
      >
        <button type="button" onClick={analyze} disabled={state.status === 'loading'} className="rounded-lg bg-accent px-3 py-2 text-sm font-bold text-white disabled:opacity-40">{state.status === 'success' ? 'Analyze again' : 'Analyze audiences'}</button>
      </ControlHeader>

      {state.status === 'idle' && <div className="rounded-2xl border border-border bg-bg-card p-8 text-center"><p className="font-bold text-text-primary">Ready to inspect audience performance</p><p className="mt-2 text-sm text-text-secondary">The analysis uses age, gender, region, placement, targeting configuration and objective-aware conversion metrics.</p></div>}
      {state.status === 'loading' && <LoadingState message="Analyzing audiences…" />}
      {state.status === 'error' && <ErrorState message={state.error} onRetry={analyze} />}

      {state.status === 'success' && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-border bg-bg-card p-5">
            <p className="text-[10px] font-black uppercase text-accent">Audience readout</p>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{state.analysis.summary}</p>
            {state.unavailableBreakdowns.length > 0 && <p className="mt-3 rounded-lg border border-status-yellow/30 bg-status-yellow/10 p-3 text-xs text-status-yellow">Unavailable Meta breakdowns: {state.unavailableBreakdowns.join(', ')}. Remaining data was analyzed normally.</p>}
          </section>

          <section>
            <div className="mb-3"><p className="text-[10px] font-black uppercase text-accent">Performance segments</p><h2 className="text-lg font-bold text-text-primary">Top audience opportunities</h2></div>
            <div className="grid gap-3 lg:grid-cols-2">{state.analysis.topSegments.map((segment, index) => <article key={`${segment.dimension}-${segment.label}-${index}`} className="rounded-2xl border border-border bg-bg-card p-4"><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-bold uppercase text-text-muted">{segment.dimension.replace('_', ' / ')}</span><h3 className="mt-1 font-bold text-text-primary">{segment.label}</h3></div><span className="text-lg font-black text-accent">{segment.score}/100</span></div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg bg-bg-secondary p-2.5"><p className="text-[10px] uppercase text-text-muted">{segment.primaryKpi}</p><p className="font-bold text-text-primary">{segment.value}</p></div><div className="rounded-lg bg-bg-secondary p-2.5"><p className="text-[10px] uppercase text-text-muted">Benchmark</p><p className="font-bold text-text-secondary">{segment.benchmark}</p></div></div><p className="mt-3 text-sm text-text-secondary">{segment.finding}</p><p className="mt-2 text-xs font-semibold text-accent">Next: {segment.recommendation}</p></article>)}</div>
          </section>

          <section>
            <div className="mb-3"><p className="text-[10px] font-black uppercase text-accent">Delivery health</p><h2 className="text-lg font-bold text-text-primary">Saturation signals</h2></div>
            <div className="grid gap-3 lg:grid-cols-2">{state.analysis.saturationSignals.map(item => <article key={item.adsetId} className="rounded-2xl border border-border bg-bg-card p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-bold text-text-primary">{item.adsetName}</p><code className="text-[10px] text-text-muted">{item.adsetId}</code></div><span className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase ${SATURATION_STYLE[item.status]}`}>{item.status.replace('_', ' ')}</span></div><p className="mt-3 text-sm text-text-secondary">{item.evidence}</p><p className="mt-2 text-xs font-semibold text-accent">{item.recommendation}</p></article>)}</div>
          </section>

          <section>
            <div className="mb-3"><p className="text-[10px] font-black uppercase text-accent">Verified shared targeting</p><h2 className="text-lg font-bold text-text-primary">Audience overlap risks</h2></div>
            {state.analysis.overlapRisks.length === 0 ? <div className="rounded-xl border border-status-green/30 bg-status-green/10 p-4 text-sm text-status-green">No confirmed shared targeting IDs were found between active ad sets.</div> : <div className="grid gap-3 lg:grid-cols-2">{state.analysis.overlapRisks.map((item, index) => <article key={`${item.adsetAId}-${item.adsetBId}-${index}`} className="rounded-2xl border border-status-yellow/30 bg-status-yellow/[0.05] p-4"><div className="flex items-center justify-between gap-2"><p className="font-bold text-text-primary">{item.adsetAName} ↔ {item.adsetBName}</p><span className="text-xs font-black uppercase text-status-yellow">{item.risk}</span></div><div className="mt-2 flex flex-wrap gap-1">{item.sharedSignals.map(signal => <span key={signal} className="rounded-md bg-bg-secondary px-2 py-1 text-[10px] text-text-muted">{signal}</span>)}</div><p className="mt-3 text-sm text-text-secondary">{item.recommendation}</p></article>)}</div>}
          </section>

          <section>
            <div className="mb-3"><p className="text-[10px] font-black uppercase text-accent">Controlled changes</p><h2 className="text-lg font-bold text-text-primary">AI recommendations</h2></div>
            <div className="space-y-3">{state.analysis.recommendations.map((item, index) => <article key={`${item.type}-${index}`} className="rounded-2xl border border-border bg-bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><span className="text-[10px] font-black uppercase text-accent">{item.type}</span><h3 className="mt-1 font-bold text-text-primary">{item.title}</h3></div><span className="text-xs font-bold text-text-muted">Confidence {item.confidence}%</span></div><p className="mt-2 text-sm text-text-secondary">{item.rationale}</p><ol className="mt-3 space-y-1">{item.steps.map((step, stepIndex) => <li key={stepIndex} className="text-xs text-text-secondary">{stepIndex + 1}. {step}</li>)}</ol>{item.adsetId && <code className="mt-3 block text-[10px] text-text-muted">Ad set: {item.adsetId}</code>}</article>)}</div>
          </section>

          <section className="rounded-2xl border border-accent/25 bg-accent/[0.05] p-5"><p className="text-[10px] font-black uppercase text-accent">Audience brief</p><h2 className="mt-1 text-lg font-bold text-text-primary">Recommended targeting direction</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{[['Target profile', state.analysis.audienceBrief.targetProfile], ['Age / gender', state.analysis.audienceBrief.ageGender], ['Geography', state.analysis.audienceBrief.geography], ['Placements', state.analysis.audienceBrief.placements], ['Expansion', state.analysis.audienceBrief.expansion], ['Exclusions', state.analysis.audienceBrief.exclusions], ['Creative match', state.analysis.audienceBrief.creativeMatch]].map(([label, value]) => <div key={label} className="rounded-lg bg-bg-card p-3"><p className="text-[10px] font-bold uppercase text-text-muted">{label}</p><p className="mt-1 text-sm text-text-secondary">{value}</p></div>)}</div><h3 className="mt-4 text-sm font-bold text-text-primary">Measurement plan</h3><ol className="mt-2 space-y-2">{state.analysis.audienceBrief.measurementPlan.map((step, index) => <li key={index} className="text-sm text-text-secondary">{index + 1}. {step}</li>)}</ol><Link href={`/accounts/${accountId}/campaigns?accountName=${encodeURIComponent(accountName)}&currency=${currency}`} className="mt-4 inline-flex rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white">Open campaigns</Link></section>
        </div>
      )}
    </PageContainer>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAiLearning } from '@/hooks/useAiLearning';
import { PageContainer } from '@/components/layout/PageContainer';
import { ControlHeader } from '@/components/layout/ControlHeader';
import { formatKpi } from '@/lib/campaign-kpis';
import type { LearningCheckpointDay, OutcomeVerdict } from '@/lib/types/ai-learning';

const VERDICT_LABEL: Record<OutcomeVerdict, string> = { improved: 'Improved', neutral: 'Stable', worse: 'Declined', insufficient_data: 'Insufficient data' };
const VERDICT_STYLE: Record<OutcomeVerdict, string> = { improved: 'bg-status-green/10 text-status-green', neutral: 'bg-accent/10 text-accent', worse: 'bg-status-red/10 text-status-red', insufficient_data: 'bg-bg-secondary text-text-muted' };
const CHECKPOINTS: LearningCheckpointDay[] = [3, 7, 14];

function daysUntil(appliedAt: string, checkpoint: number) {
  return Math.max(0, Math.ceil((new Date(appliedAt).getTime() + checkpoint * 86400000 - Date.now()) / 86400000));
}

export default function AiLearningPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const { accountId } = useParams<{ accountId: string }>();
  const searchParams = useSearchParams();
  const accountName = searchParams.get('accountName') ?? accountId;
  const currency = searchParams.get('currency') ?? 'USD';
  const learning = useAiLearning(accountId, auth.token);
  const [source, setSource] = useState<'all' | 'optimization_plan' | 'recommendation' | 'budget_optimizer'>('all');
  useEffect(() => { if (!auth.isLoading && !auth.token) router.replace('/login'); }, [auth.isLoading, auth.token, router]);
  const records = useMemo(() => learning.records.filter(record => source === 'all' || record.source === source), [learning.records, source]);
  const checkpoints = learning.records.flatMap(record => record.checkpoints);
  const improved = checkpoints.filter(item => item.verdict === 'improved').length;
  const evaluated = checkpoints.filter(item => item.verdict !== 'insufficient_data').length;
  if (auth.isLoading) return null;

  return (
    <PageContainer>
      <ControlHeader
        breadcrumbs={[{ label: 'Accounts', href: '/accounts' }, { label: accountName, href: `/accounts/${accountId}` }, { label: 'AI Learning' }]}
        eyebrow="Account-specific feedback loop"
        title="AI Learning Center"
        description="Measure performance before and after each change at 3, 7, and 14 days, then turn observed results into account-specific optimization guidance."
        badge="Learn from outcomes"
        stats={[
          { label: 'actions', value: learning.records.length, tone: 'blue' },
          { label: 'evaluations', value: checkpoints.length, tone: 'neutral' },
          { label: 'improved', value: evaluated ? `${Math.round(improved / evaluated * 100)}%` : '—', tone: 'green' },
        ]}
      >
        <div className="flex flex-wrap gap-2"><button onClick={learning.evaluateDue} disabled={!learning.dueCount || learning.isEvaluating} className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white disabled:bg-bg-secondary disabled:text-text-muted">{learning.isEvaluating ? 'Loading Meta results…' : `Evaluate due checkpoints (${learning.dueCount})`}</button><button onClick={learning.generateProfile} disabled={!learning.records.length || learning.isProfiling} className="rounded-lg border border-border bg-bg-card px-3 py-2 text-xs font-bold text-text-secondary disabled:opacity-40">{learning.isProfiling ? 'Meta Ads AI is summarizing…' : learning.profile ? 'Update learning profile' : 'Create learning profile'}</button></div>
      </ControlHeader>

      {learning.error && <p className="mb-4 rounded-lg border border-status-red/30 bg-status-red/10 p-3 text-sm text-status-red">{learning.error}</p>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <main className="min-w-0 space-y-4">
          <div className="flex flex-wrap gap-2">{(['all', 'optimization_plan', 'recommendation', 'budget_optimizer'] as const).map(value => <button key={value} onClick={() => setSource(value)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${source === value ? 'border-accent bg-accent text-white' : 'border-border bg-bg-card text-text-secondary'}`}>{value === 'all' ? `All (${learning.records.length})` : value.replaceAll('_', ' ')}</button>)}</div>

          {records.length === 0 && <div className="rounded-xl border border-dashed border-border bg-bg-card p-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-xl text-accent">◎</div><h2 className="mt-3 text-lg font-bold text-text-primary">No actions to evaluate</h2><p className="mx-auto mt-2 max-w-xl text-sm text-text-secondary">Actions applied through the optimization plan appear here. Tracking starts when an action is recorded.</p><Link href={`/accounts/${accountId}/optimization-plan?accountName=${encodeURIComponent(accountName)}&currency=${currency}`} className="meta-action meta-action-primary mt-4">Open optimization plan</Link></div>}

          {records.map(record => <article key={record.id} className="rounded-xl border border-border bg-bg-card p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded bg-accent/10 px-2 py-1 text-[10px] font-black uppercase text-accent">{record.source.replaceAll('_', ' ')}</span><span className="rounded bg-bg-secondary px-2 py-1 text-[10px] font-bold uppercase text-text-muted">{record.actionType.replaceAll('_', ' ')}</span><span className={`rounded px-2 py-1 text-[10px] font-black uppercase ${record.accepted ? 'bg-status-green/10 text-status-green' : 'bg-bg-secondary text-text-muted'}`}>{record.accepted ? 'Accepted' : 'Rejected'}</span></div><h2 className="mt-2 font-bold text-text-primary">{record.recommendationTitle}</h2><Link href={record.href} className="mt-1 inline-block text-xs font-bold text-accent hover:underline">{record.entityName} ↗</Link></div><div className="text-right"><p className="text-xs font-bold text-text-secondary">{new Date(record.appliedAt).toLocaleDateString('en-US')}</p><p className="mt-1 text-[10px] uppercase text-text-muted">{record.userOutcome.replaceAll('_', ' ')}</p></div></div>

            {record.accepted ? <div className="mt-4 grid gap-2 sm:grid-cols-3">{CHECKPOINTS.map(days => { const checkpoint = record.checkpoints.find(item => item.days === days); const remaining = daysUntil(record.appliedAt, days); return <div key={days} className={`rounded-lg border p-3 ${checkpoint ? 'border-border bg-bg-secondary/40' : remaining === 0 ? 'border-status-yellow/30 bg-status-yellow/[0.06]' : 'border-border bg-bg-primary/30'}`}><div className="flex items-center justify-between"><p className="text-xs font-black text-text-primary">After {days} days</p>{checkpoint ? <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${VERDICT_STYLE[checkpoint.verdict]}`}>{VERDICT_LABEL[checkpoint.verdict]}</span> : <span className="text-[10px] font-bold text-text-muted">{remaining === 0 ? 'Due' : `remaining ${remaining} days`}</span>}</div>{checkpoint ? <><div className="mt-3 grid grid-cols-2 gap-2"><div><p className="text-[9px] uppercase text-text-muted">Before</p><p className="text-sm font-bold text-text-secondary">{formatKpi(checkpoint.before.objectiveKpis.primary, currency)}</p></div><div><p className="text-[9px] uppercase text-text-muted">After</p><p className="text-sm font-black text-text-primary">{formatKpi(checkpoint.after.objectiveKpis.primary, currency)}</p></div></div><p className={`mt-2 text-xs font-black ${checkpoint.improvementPercent != null && checkpoint.improvementPercent > 0 ? 'text-status-green' : checkpoint.improvementPercent != null && checkpoint.improvementPercent < 0 ? 'text-status-red' : 'text-text-muted'}`}>{checkpoint.improvementPercent == null ? 'Improvement cannot be calculated' : `${checkpoint.improvementPercent > 0 ? '+' : ''}${checkpoint.improvementPercent.toFixed(1)}% performance change`}</p><p className="mt-1 text-[10px] text-text-muted">{checkpoint.explanation}</p></> : <p className="mt-3 text-[10px] leading-relaxed text-text-muted">The system compares {days} days before and after the change.</p>}</div>; })}</div> : <p className="mt-4 rounded-lg bg-bg-secondary/50 p-3 text-xs text-text-muted">This recommendation was skipped, so no performance checkpoint was created.</p>}
          </article>)}
        </main>

        <aside className="h-fit space-y-3 xl:sticky xl:top-4">{learning.profile ? <><section className="rounded-xl border border-accent/30 bg-accent/[0.06] p-4"><p className="text-[10px] font-black uppercase text-accent">Account learning profile</p><h2 className="mt-1 font-bold text-text-primary">What has AI learned?</h2><p className="mt-2 text-sm leading-relaxed text-text-secondary">{learning.profile.summary}</p><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg bg-bg-card p-2"><p className="text-[9px] uppercase text-text-muted">Confidence</p><p className="font-black text-accent">{learning.profile.confidence}%</p></div><div className="rounded-lg bg-bg-card p-2"><p className="text-[9px] uppercase text-text-muted">Sample</p><p className="font-black text-text-primary">{learning.profile.sampleSize}</p></div></div>{learning.profile.safeBudgetChangePercent != null && <p className="mt-3 rounded-lg bg-bg-card p-3 text-xs text-text-secondary">Budget adjustment with positive observed results: <strong className="text-status-green">≈ {learning.profile.safeBudgetChangePercent.toFixed(0)}%</strong></p>}</section><section className="rounded-xl border border-border bg-bg-card p-4"><p className="text-xs font-bold text-text-primary">Guidance for your next optimization</p><ul className="mt-2 space-y-2">{learning.profile.nextRules.map((rule, index) => <li key={index} className="text-xs leading-relaxed text-text-secondary">• {rule}</li>)}</ul></section><section className="rounded-xl border border-border bg-bg-card p-4"><p className="text-xs font-bold text-text-primary">Action patterns</p><div className="mt-2 space-y-2">{learning.profile.successfulActionTypes.map(item => <div key={item.actionType} className="rounded-lg bg-status-green/[0.06] p-2.5"><div className="flex justify-between text-xs"><strong className="text-text-primary">{item.actionType.replaceAll('_', ' ')}</strong><span className="font-black text-status-green">{item.successRate.toFixed(0)}%</span></div><p className="mt-1 text-[10px] text-text-muted">{item.learning}</p></div>)}</div></section></> : <section className="rounded-xl border border-border bg-bg-card p-4"><p className="text-[10px] font-black uppercase text-accent">Learning profile</p><p className="mt-2 text-sm text-text-secondary">Once actions have been recorded, create a profile to identify relevant budget limits, KPIs, and action patterns for this account.</p></section>}<p className="px-1 text-[10px] leading-relaxed text-text-muted">Before-and-after results show an observed association. They do not establish that a change was the only cause of a performance shift.</p></aside>
      </div>
    </PageContainer>
  );
}

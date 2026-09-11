'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizationPlan } from '@/hooks/useOptimizationPlan';
import { PageContainer } from '@/components/layout/PageContainer';
import { LoadingState } from '@/components/ui/LoadingState';
import { ControlHeader } from '@/components/layout/ControlHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatCurrency } from '@/lib/utils';
import type { OptimizationPlanItem, PlanItemStatus } from '@/lib/types/optimization-plan';

const GOALS = ['Improve objective-specific performance', 'Increase ROAS', 'Reduce CPA or CPL', 'Increase conversions', 'Reduce wasted spend', 'Stabilize delivery'];
const STATUS_LABEL: Record<PlanItemStatus, string> = { pending: 'Pending review', applied: 'Applied', monitoring: 'Monitoring', success: 'Successful', ineffective: 'Ineffective', rolled_back: 'Rolled back' };
const STATUS_STYLE: Record<PlanItemStatus, string> = {
  pending: 'border-border bg-bg-secondary text-text-muted', applied: 'border-accent/30 bg-accent/10 text-accent', monitoring: 'border-status-yellow/30 bg-status-yellow/10 text-status-yellow',
  success: 'border-status-green/30 bg-status-green/10 text-status-green', ineffective: 'border-status-red/30 bg-status-red/10 text-status-red', rolled_back: 'border-border bg-bg-secondary text-text-secondary',
};

function actionLabel(item: OptimizationPlanItem) {
  const labels = { pause_entity: 'Pause', activate_entity: 'Activate', adjust_daily_budget: 'Adjust budget', replace_creative: 'Thay creative', expand_audience: 'Expand audience', review_tracking: 'Review tracking', review_performance: 'Review performance', monitor: 'Monitor' };
  return labels[item.action.type];
}

function scheduledDate(startDate: string, day: number) {
  const date = new Date(`${startDate}T00:00:00`); date.setDate(date.getDate() + day - 1);
  return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' });
}

export default function OptimizationPlanPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const { accountId } = useParams<{ accountId: string }>();
  const searchParams = useSearchParams();
  const accountName = searchParams.get('accountName') ?? accountId;
  const currency = searchParams.get('currency') ?? 'USD';
  const [duration, setDuration] = useState<7 | 14>(7);
  const [goal, setGoal] = useState(GOALS[0]);
  const [selected, setSelected] = useState<OptimizationPlanItem | null>(null);
  const [filter, setFilter] = useState<'all' | PlanItemStatus>('all');
  const planner = useOptimizationPlan(accountId, accountName, currency, duration, auth.token);

  useEffect(() => { if (!auth.isLoading && !auth.token) router.replace('/login'); }, [auth.isLoading, auth.token, router]);
  useEffect(() => {
    if (planner.plan) { setDuration(planner.plan.durationDays); setGoal(planner.plan.primaryGoal || GOALS[0]); }
    // Only restore controls when a different persisted/generated plan is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planner.plan?.id]);
  const counts = useMemo(() => planner.plan?.items.reduce<Record<PlanItemStatus, number>>((result, item) => { result[item.status] += 1; return result; }, { pending: 0, applied: 0, monitoring: 0, success: 0, ineffective: 0, rolled_back: 0 }), [planner.plan]);
  const complete = (counts?.success ?? 0) + (counts?.ineffective ?? 0) + (counts?.rolled_back ?? 0);
  const filteredItems = planner.plan?.items.filter(item => filter === 'all' || item.status === filter) ?? [];
  if (auth.isLoading) return null;

  return (
    <PageContainer>
      <ControlHeader
        breadcrumbs={[{ label: 'Accounts', href: '/accounts' }, { label: accountName, href: `/accounts/${accountId}` }, { label: 'Optimization Plan' }]}
        eyebrow="AI execution cycle"
        title="AI Optimization Plan"
        description="Build a 7- or 14-day optimization cycle, review each proposed change, and track its results through evaluation or rollback."
        badge="Plan → Apply → Monitor"
        stats={planner.plan ? [
          { label: 'progress', value: `${complete}/${planner.plan.items.length}`, tone: 'blue' },
          { label: 'monitoring', value: counts?.monitoring ?? 0, tone: 'amber' },
          { label: 'success', value: counts?.success ?? 0, tone: 'green' },
        ] : []}
      />

      <section className="mb-4 rounded-xl border border-border bg-bg-card p-4">
        <div className="grid gap-4 md:grid-cols-[10rem_minmax(0,1fr)_auto] md:items-end">
          <label><span className="text-xs font-bold text-text-muted">Cycle</span><select value={duration} onChange={event => setDuration(Number(event.target.value) as 7 | 14)} className="mt-1.5 w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-sm font-bold text-text-primary"><option value={7}>7 days</option><option value={14}>14 days</option></select></label>
          <label><span className="text-xs font-bold text-text-muted">Primary goal</span><select value={goal} onChange={event => setGoal(event.target.value)} className="mt-1.5 w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-sm font-bold text-text-primary">{GOALS.map(item => <option key={item}>{item}</option>)}</select></label>
          <button onClick={() => planner.generate(goal)} disabled={planner.dataState.status !== 'ready' || planner.isGenerating} className="meta-action meta-action-primary px-5 py-2.5 disabled:opacity-40">{planner.isGenerating ? 'AI is generating your plan…' : planner.plan ? 'Start a new cycle' : 'Generate AI plan'}</button>
        </div>
        {planner.dataState.status === 'loading' && <p className="mt-3 text-xs text-text-muted">Loading Meta snapshots for both periods…</p>}
        {planner.dataState.status === 'error' && <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-status-red/30 bg-status-red/10 p-3 text-xs text-status-red"><span>{planner.dataState.error}</span><button onClick={planner.reload} className="font-bold underline">Try again</button></div>}
        {planner.error && <p className="mt-3 rounded-lg border border-status-red/30 bg-status-red/10 p-3 text-xs text-status-red">{planner.error}</p>}
      </section>

      {!planner.plan && !planner.isGenerating && <div className="rounded-xl border border-dashed border-border bg-bg-card p-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-xl text-accent">↗</div><h2 className="mt-3 text-lg font-bold text-text-primary">No optimization cycle yet</h2><p className="mx-auto mt-2 max-w-2xl text-sm text-text-secondary">AI schedules actions using current and previous performance. Every change to Meta requires your separate approval.</p></div>}
      {planner.isGenerating && <LoadingState message="Preparing your optimization plan…" />}

      {planner.plan && !planner.isGenerating && <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <main className="min-w-0 space-y-4">
          <section className="overflow-hidden rounded-xl border border-accent/30 bg-bg-card"><div className="bg-accent/10 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase text-accent">Current cycle · {planner.plan.durationDays} days</p><h2 className="mt-1 text-xl font-black text-text-primary">{planner.plan.title}</h2></div><span className="rounded-lg bg-accent px-2.5 py-1 text-xs font-bold text-white">{planner.plan.confidence}% confidence</span></div><p className="mt-3 text-sm leading-relaxed text-text-secondary">{planner.plan.summary}</p><p className="mt-2 text-xs text-text-muted">Goal: {planner.plan.primaryGoal} · Baseline {planner.plan.baselinePeriod.current.since} → {planner.plan.baselinePeriod.current.until}</p></div><div className="h-1.5 bg-bg-secondary"><div className="h-full bg-status-green transition-all" style={{ width: `${planner.plan.items.length ? complete / planner.plan.items.length * 100 : 0}%` }} /></div></section>

          <div className="flex flex-wrap gap-2">{(['all', 'pending', 'applied', 'monitoring', 'success', 'ineffective', 'rolled_back'] as const).map(value => <button key={value} onClick={() => setFilter(value)} className={`rounded-lg border px-3 py-2 text-xs font-bold ${filter === value ? 'border-accent bg-accent text-white' : 'border-border bg-bg-card text-text-secondary'}`}>{value === 'all' ? `All (${planner.plan!.items.length})` : `${STATUS_LABEL[value]} (${counts?.[value] ?? 0})`}</button>)}</div>

          <div className="space-y-3">{filteredItems.map((item, index) => <article key={item.id} className="relative overflow-hidden rounded-xl border border-border bg-bg-card p-4 sm:p-5"><div className="absolute bottom-0 left-0 top-0 w-1 bg-accent/50" /><div className="flex flex-col gap-4 sm:flex-row"><div className="flex shrink-0 items-start gap-2 sm:w-24 sm:block"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-sm font-black text-accent">D{item.day}</div><p className="mt-0.5 text-[10px] font-bold text-text-muted sm:mt-2">{scheduledDate(planner.plan!.startDate, item.day)}</p></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase ${STATUS_STYLE[item.status]}`}>{STATUS_LABEL[item.status]}</span><span className="rounded-md bg-bg-secondary px-2 py-1 text-[10px] font-bold uppercase text-text-muted">{item.phase}</span><span className="text-[10px] font-black uppercase text-accent">{actionLabel(item)}</span></div><h3 className="mt-2 text-base font-bold text-text-primary">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-text-secondary">{item.description}</p><Link href={item.href} className="mt-2 inline-block text-xs font-bold text-accent hover:underline">{item.entityName} ↗</Link><div className="mt-3 grid gap-2 md:grid-cols-2"><div className="rounded-lg bg-bg-secondary/55 p-3"><p className="text-[10px] font-black uppercase text-text-muted">Evidence</p>{item.evidence.map((evidence, evidenceIndex) => <p key={evidenceIndex} className="mt-1 text-xs text-text-secondary">• {evidence}</p>)}</div><div className="rounded-lg bg-status-green/[0.06] p-3"><p className="text-[10px] font-black uppercase text-status-green">Success criteria</p><p className="mt-1 text-xs text-text-secondary">{item.successMetric}</p><p className="mt-2 text-[10px] text-text-muted">Review sau {item.reviewAfterDays} days</p></div></div>{item.action.type === 'adjust_daily_budget' && item.action.canApply && <div className="mt-3 rounded-lg border border-accent/20 bg-accent/[0.05] p-3 text-xs text-text-secondary">Daily budget: <strong>{formatCurrency(item.action.currentDailyBudgetRaw, planner.plan!.currency)}</strong> → <strong className="text-accent">{formatCurrency(item.action.proposedDailyBudgetRaw, planner.plan!.currency)}</strong> ({item.action.changePercent > 0 ? '+' : ''}{item.action.changePercent}%)</div>}<p className="mt-3 text-xs text-text-muted">{item.action.instruction}</p>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                      {item.status === 'pending' && <button onClick={() => item.action.canApply ? setSelected(item) : planner.apply(item)} disabled={planner.workingId === item.id} className="meta-action meta-action-primary disabled:opacity-40">{planner.workingId === item.id ? 'Processing…' : item.action.canApply ? 'Review and apply' : 'Mark as performed'}</button>}
                      {item.status === 'applied' && <button onClick={() => planner.setStatus(item.id, 'monitoring')} className="meta-action meta-action-primary">Start monitoring</button>}
                      {item.status === 'monitoring' && <><button onClick={() => planner.setStatus(item.id, 'success')} className="meta-action border border-status-green/30 bg-status-green/10 text-status-green">Mark as successful</button><button onClick={() => planner.setStatus(item.id, 'ineffective')} className="meta-action border border-status-red/30 bg-status-red/10 text-status-red">Ineffective</button></>}
                      {['applied', 'monitoring', 'success', 'ineffective'].includes(item.status) && <button onClick={() => planner.rollback(item)} disabled={planner.workingId === item.id} className="meta-action meta-action-secondary disabled:opacity-40">{planner.workingId === item.id ? 'Rolling back…' : item.action.canApply ? 'Roll back on Meta' : 'Mark as rolled back'}</button>}
                      {item.execution?.appliedAt && <span className="self-center text-[10px] text-text-muted">Apply {new Date(item.execution.appliedAt).toLocaleString('en-US')}</span>}
                    </div>
                  </div></div></article>)}</div>
          {filteredItems.length === 0 && <div className="rounded-xl border border-border bg-bg-card p-8 text-center text-sm text-text-muted">No actions match this status.</div>}
        </main>

        <aside className="h-fit space-y-3 xl:sticky xl:top-4"><Link href={`/accounts/${accountId}/ai-learning?accountName=${encodeURIComponent(accountName)}&currency=${currency}`} className="block rounded-xl border border-accent/30 bg-accent/[0.06] p-4"><p className="text-[10px] font-black uppercase text-accent">Feedback loop</p><p className="mt-1 text-sm font-bold text-text-primary">Open AI Learning Center →</p><p className="mt-1 text-xs text-text-secondary">Evaluate results at 3, 7, and 14 days after each action.</p></Link><div className="rounded-xl border border-border bg-bg-card p-4"><p className="text-[10px] font-black uppercase text-accent">Guardrails</p><ul className="mt-2 space-y-2">{planner.plan.guardrails.map((item, index) => <li key={index} className="text-xs leading-relaxed text-text-secondary">• {item}</li>)}</ul></div><div className="rounded-xl border border-status-yellow/25 bg-status-yellow/[0.06] p-4"><p className="text-xs font-bold text-status-yellow">Risks to monitor</p><ul className="mt-2 space-y-2">{planner.plan.risks.map((item, index) => <li key={index} className="text-xs leading-relaxed text-text-secondary">• {item}</li>)}</ul></div><button onClick={planner.clear} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2.5 text-xs font-bold text-text-muted hover:border-status-red/30 hover:text-status-red">Delete current plan</button></aside>
      </div>}

      <ConfirmDialog open={Boolean(selected)} title={selected ? `${actionLabel(selected)} ${selected.entityName}?` : 'Apply this action?'} description={selected ? `${selected.action.instruction} This change will be sent to Meta. Review the values and scope before confirming.` : ''} confirmLabel="Apply on Meta" loading={Boolean(selected && planner.workingId === selected.id)} onConfirm={async () => { if (!selected) return; await planner.apply(selected); setSelected(null); }} onCancel={() => setSelected(null)} />
    </PageContainer>
  );
}

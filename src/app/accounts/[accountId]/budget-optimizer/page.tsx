'use client';
import { usePublishAIView } from '@/hooks/useAIViewContext';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useAccountCurrency } from '@/hooks/useAccountCurrency';
import { useBudgetOptimizer } from '@/hooks/useBudgetOptimizer';
import { PageContainer } from '@/components/layout/PageContainer';
import { ControlHeader } from '@/components/layout/ControlHeader';
import { DateFilter } from '@/components/ui/DateFilter';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toaster';
import { updateCampaignBudget } from '@/lib/api/mutations';
import { cacheInvalidatePrefix } from '@/lib/api/client';
import { GRAPH_API_BASE } from '@/lib/constants';
import { insightToLearningMetrics } from '@/lib/api/aiLearning';
import { upsertLearningRecord } from '@/lib/learning-store';
import { getBudgetRange } from '@/lib/budget-optimizer';
import {
  amountToRawBudget,
  formatCurrency,
  rawBudgetToAmount,
} from '@/lib/utils';
import type { DatePreset, DateRange } from '@/lib/types';
import type {
  BudgetAllocation,
  BudgetCampaignInput,
  BudgetGoal,
  BudgetMode,
} from '@/lib/types/budget-optimizer';

const MODES: Array<{ id: BudgetMode; label: string; limit: string; detail: string }> = [
  { id: 'conservative', label: 'Conservative', limit: '±10%', detail: 'Small, low-risk movements' },
  { id: 'balanced', label: 'Balanced', limit: '±20%', detail: 'Meaningful controlled reallocation' },
  { id: 'aggressive', label: 'Aggressive', limit: '±40%', detail: 'Faster shifts toward winners' },
];

const GOALS: Array<{ id: BudgetGoal; label: string }> = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'conversions', label: 'Conversions' },
  { id: 'leads', label: 'Leads' },
  { id: 'traffic', label: 'Traffic' },
  { id: 'roas', label: 'ROAS' },
];

export default function BudgetOptimizerPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const params = useParams<{ accountId: string }>();
  const searchParams = useSearchParams();
  const accountId = params.accountId;
  const accountName = searchParams.get('accountName') ?? accountId;
  const currency = useAccountCurrency(accountId, auth.token, searchParams.get('currency') ?? undefined);
  const { toast } = useToast();

  const [dateFilter, setDateFilter] = useState<DatePreset | DateRange>('last_30d');
  usePublishAIView(dateFilter);
  const [goal, setGoal] = useState<BudgetGoal>('conversions');
  const [mode, setMode] = useState<BudgetMode>('balanced');
  const [targetBudget, setTargetBudget] = useState('');
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [applyingAll, setApplyingAll] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const initializedCurrency = useRef<string | null>(null);

  const { state, insights, retry } = useCampaigns(accountId, auth.token, dateFilter);
  const { state: optimizerState, analyze, reset } = useBudgetOptimizer();

  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace('/login');
  }, [auth.isLoading, auth.token, router]);

  const campaigns = state.status === 'success' ? state.data : [];
  const eligibleCampaigns = useMemo(
    () => campaigns.filter(campaign => campaign.status === 'ACTIVE' && Number(campaign.daily_budget) > 0),
    [campaigns],
  );

  const budgetInputs = useMemo<BudgetCampaignInput[]>(
    () => eligibleCampaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      dailyBudgetRaw: campaign.daily_budget as string,
    })),
    [eligibleCampaigns],
  );
  const range = useMemo(() => getBudgetRange(budgetInputs, mode), [budgetInputs, mode]);

  useEffect(() => {
    if (range.current > 0 && initializedCurrency.current !== currency) {
      setTargetBudget(String(rawBudgetToAmount(range.current, currency)));
      initializedCurrency.current = currency;
    }
  }, [range.current, currency]);

  useEffect(() => {
    reset();
    setAppliedIds(new Set());
  }, [dateFilter, goal, mode, reset]);

  const targetRaw = Number(amountToRawBudget(targetBudget, currency));
  const targetIsValid = Number.isInteger(targetRaw) && targetRaw >= range.min && targetRaw <= range.max;

  function runOptimizer() {
    setAppliedIds(new Set());
    analyze({ accountId, campaigns, insights, currency, dateFilter, goal, mode, targetTotalBudget: targetBudget });
  }

  async function applyAllocation(allocation: BudgetAllocation, refresh = true) {
    if (!auth.token || !allocation.canApply || appliedIds.has(allocation.campaignId)) return false;
    const currentCampaign = campaigns.find(campaign => campaign.id === allocation.campaignId);
    if (!currentCampaign || currentCampaign.daily_budget !== allocation.currentDailyBudgetRaw) {
      toast(`Budget changed for ${allocation.campaignName}. Generate a new plan.`, 'error');
      return false;
    }

    setApplyingId(allocation.campaignId);
    try {
      await updateCampaignBudget(allocation.campaignId, allocation.proposedDailyBudgetRaw, auth.token);
      const baselineContext = insightToLearningMetrics(insights[allocation.campaignId], currentCampaign.objective);
      upsertLearningRecord({
        id: `budget:${allocation.campaignId}:${Date.now()}`, accountId, source: 'budget_optimizer', sourceId: allocation.campaignId,
        entityType: 'campaign', entityId: allocation.campaignId, entityName: allocation.campaignName, href: `/accounts/${accountId}/campaigns/${allocation.campaignId}`,
        objective: currentCampaign.objective, objectiveFamily: baselineContext.objectiveKpis.objectiveFamily,
        recommendationTitle: `Budget Optimizer: ${allocation.campaignName}`, actionType: 'update_campaign_budget', changePercent: allocation.changePercent,
        accepted: true, userOutcome: 'applied', appliedAt: new Date().toISOString(), baselineContext, checkpoints: [],
      });
      setAppliedIds(previous => new Set(previous).add(allocation.campaignId));
      cacheInvalidatePrefix(`${GRAPH_API_BASE}/${allocation.campaignId}`);
      if (refresh) {
        cacheInvalidatePrefix(`${GRAPH_API_BASE}/act_${accountId}/campaigns`);
        retry();
        toast(`Budget updated for ${allocation.campaignName}.`, 'success');
      }
      return true;
    } catch (error) {
      toast(error instanceof Error ? error.message : `Failed to update ${allocation.campaignName}.`, 'error');
      return false;
    } finally {
      setApplyingId(null);
    }
  }

  async function applyAll() {
    if (optimizerState.status !== 'success') return;
    setConfirmAll(false);
    setApplyingAll(true);
    let succeeded = 0;
    let failed = 0;

    for (const allocation of optimizerState.plan.allocations) {
      if (!allocation.canApply || appliedIds.has(allocation.campaignId)) continue;
      if (await applyAllocation(allocation, false)) succeeded += 1;
      else failed += 1;
    }

    cacheInvalidatePrefix(`${GRAPH_API_BASE}/act_${accountId}/campaigns`);
    retry();
    setApplyingAll(false);
    toast(
      failed > 0 ? `${succeeded} budgets updated, ${failed} failed.` : `${succeeded} campaign budgets updated.`,
      failed > 0 ? 'error' : 'success',
    );
  }

  if (auth.isLoading || state.status === 'idle') return null;

  return (
    <PageContainer>
      <ControlHeader
        breadcrumbs={[
          { label: 'Accounts', href: '/accounts' },
          { label: accountName, href: `/accounts/${accountId}` },
          { label: 'Budget Optimizer' },
        ]}
        eyebrow="AI budget allocation"
        title="Budget Optimizer"
        description="Score active campaigns with Meta Ads AI, simulate a controlled allocation, and apply budget changes."
        badge="Meta Ads AI"
        stats={state.status === 'success' ? [
          { label: 'eligible', value: eligibleCampaigns.length, tone: 'neutral' },
          { label: 'mode', value: mode, tone: 'blue' },
        ] : []}
      />

      {state.status === 'loading' && <LoadingState message="Loading campaigns and performance metrics…" />}
      {state.status === 'error' && <ErrorState message={state.error} onRetry={retry} />}

      {state.status === 'success' && (
        <div className="space-y-4">
          <section className="meta-panel overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="text-[10px] font-black uppercase text-accent">Scenario settings</p>
              <h2 className="mt-1 font-bold text-text-primary">Build an allocation plan</h2>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-2">
              <DateFilter value={dateFilter} onChange={setDateFilter} disabled={optimizerState.status === 'analyzing'} />

              <label className="block">
                <span className="text-xs font-bold uppercase text-text-muted">Optimization goal</span>
                <select
                  value={goal}
                  onChange={event => setGoal(event.target.value as BudgetGoal)}
                  className="mt-2 w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-sm font-semibold text-text-primary"
                >
                  {GOALS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>

              <label className="block lg:col-span-2">
                <span className="text-xs font-bold uppercase text-text-muted">Target total daily budget ({currency})</span>
                <input
                  type="number"
                  min="0"
                  value={targetBudget}
                  onChange={event => setTargetBudget(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-base font-bold text-text-primary focus:border-accent focus:outline-none"
                />
                {range.current > 0 && (
                  <p className={`mt-2 text-xs ${targetIsValid ? 'text-text-muted' : 'text-status-yellow'}`}>
                    Current: {formatCurrency(range.current, currency)} · Allowed for this mode: {formatCurrency(range.min, currency)}–{formatCurrency(range.max, currency)}
                  </p>
                )}
              </label>

              <div className="grid gap-2 lg:col-span-2 sm:grid-cols-3">
                {MODES.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setMode(item.id)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      mode === item.id ? 'border-accent bg-accent/10' : 'border-border bg-bg-secondary/45 hover:border-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-text-primary">{item.label}</span>
                      <span className="text-xs font-black text-accent">{item.limit}</span>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">{item.detail}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border p-4">
              <button
                onClick={runOptimizer}
                disabled={!targetIsValid || eligibleCampaigns.length === 0 || optimizerState.status === 'analyzing'}
                className="meta-action meta-action-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {optimizerState.status === 'analyzing' ? 'Meta Ads AI is building the plan…' : 'Generate budget plan'}
              </button>
            </div>
          </section>

          {eligibleCampaigns.length === 0 && (
            <div className="rounded-xl border border-status-yellow/30 bg-status-yellow/5 p-4 text-sm text-status-yellow">
              This account has no active campaigns with a daily budget. Lifetime-budget campaigns are not changed.
            </div>
          )}

          {optimizerState.status === 'error' && (
            <div className="rounded-xl border border-status-red/30 bg-status-red/10 p-4 text-sm text-status-red">
              {optimizerState.error}
            </div>
          )}

          {optimizerState.status === 'success' && (
            <BudgetPlanView
              plan={optimizerState.plan}
              appliedIds={appliedIds}
              applyingId={applyingId}
              applyingAll={applyingAll}
              onApply={allocation => applyAllocation(allocation)}
              onApplyAll={() => setConfirmAll(true)}
            />
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmAll}
        title="Apply the complete budget plan?"
        description="Every changed campaign will receive its proposed daily budget. Campaigns already updated are skipped."
        confirmLabel="Apply all"
        loading={applyingAll}
        onConfirm={applyAll}
        onCancel={() => setConfirmAll(false)}
      />
    </PageContainer>
  );
}

function BudgetPlanView({
  plan,
  appliedIds,
  applyingId,
  applyingAll,
  onApply,
  onApplyAll,
}: {
  plan: import('@/lib/types/budget-optimizer').BudgetPlan;
  appliedIds: Set<string>;
  applyingId: string | null;
  applyingAll: boolean;
  onApply: (allocation: BudgetAllocation) => void;
  onApplyAll: () => void;
}) {
  const changed = plan.allocations.filter(item => item.canApply);

  return (
    <section className="meta-panel overflow-hidden">
      <div className="border-b border-border bg-text-primary px-4 py-4 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase text-white/65">Recommended scenario</p>
            <h2 className="mt-1 text-lg font-black">{plan.mode} allocation</h2>
          </div>
          <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold">
            {Math.round(plan.confidence)}% confidence
          </span>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/78">{plan.summary}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <PlanMetric label="Current/day" value={formatCurrency(plan.currentTotalBudgetRaw, plan.currency)} />
          <PlanMetric label="Target/day" value={formatCurrency(plan.targetTotalBudgetRaw, plan.currency)} />
          <PlanMetric label="Campaign changes" value={String(changed.length)} />
        </div>
      </div>

      {plan.warnings.length > 0 && (
        <div className="border-b border-status-yellow/20 bg-status-yellow/5 px-4 py-3">
          {plan.warnings.map((warning, index) => (
            <p key={index} className="text-xs leading-relaxed text-status-yellow">• {warning}</p>
          ))}
        </div>
      )}

      <div className="divide-y divide-border">
        {plan.allocations.map(allocation => {
          const applied = appliedIds.has(allocation.campaignId);
          const changeTone = allocation.changePercent > 0
            ? 'text-status-green'
            : allocation.changePercent < 0
              ? 'text-status-yellow'
              : 'text-text-muted';

          return (
            <article key={allocation.campaignId} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-bold text-text-primary">{allocation.campaignName}</h3>
                    <span className={`text-xs font-black ${changeTone}`}>
                      {allocation.changePercent > 0 ? '+' : ''}{allocation.changePercent}%
                    </span>
                    <span className="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
                      score {Math.round(allocation.score)}
                    </span>
                  </div>
                  <code className="text-[11px] text-text-muted">{allocation.campaignId}</code>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{allocation.rationale}</p>
                  <p className="mt-1 text-xs text-text-muted">Expected: {allocation.expectedImpact}</p>
                </div>

                <div className="flex min-w-[220px] items-center gap-2 sm:justify-end">
                  <div className="flex-1 rounded-lg bg-bg-secondary/60 px-3 py-2 text-right">
                    <p className="text-[10px] font-bold uppercase text-text-muted">Daily budget</p>
                    <p className="mt-1 text-sm font-bold text-text-primary">
                      {formatCurrency(allocation.currentDailyBudgetRaw, plan.currency)} →{' '}
                      <span className={changeTone}>{formatCurrency(allocation.proposedDailyBudgetRaw, plan.currency)}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => onApply(allocation)}
                    disabled={!allocation.canApply || applied || applyingAll || applyingId === allocation.campaignId}
                    className="rounded-lg bg-accent px-3 py-2.5 text-xs font-bold text-white disabled:bg-bg-secondary disabled:text-text-muted"
                  >
                    {applied ? 'Applied' : applyingId === allocation.campaignId ? 'Applying…' : allocation.canApply ? 'Apply' : 'Hold'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {changed.length > 0 && (
        <div className="border-t border-border p-4">
          <button
            onClick={onApplyAll}
            disabled={applyingAll || changed.every(item => appliedIds.has(item.campaignId))}
            className="meta-action meta-action-primary w-full py-3 disabled:opacity-50"
          >
            {applyingAll ? 'Applying budget plan…' : `Apply all ${changed.length} changes`}
          </button>
        </div>
      )}
    </section>
  );
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/8 px-3 py-2">
      <p className="text-[10px] font-bold uppercase text-white/55">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

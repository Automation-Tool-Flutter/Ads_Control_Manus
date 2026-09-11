'use client';
import { Modal } from '@/components/ui/Modal';
import { usePublishAIView } from '@/hooks/useAIViewContext';

import { useEffect, useState, useRef, useDeferredValue, useMemo } from 'react';
import { useViewState } from '@/hooks/useViewState';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useAccountCurrency } from '@/hooks/useAccountCurrency';
import { useCampaignAnalysis } from '@/hooks/useCampaignAnalysis';
import { PageContainer } from '@/components/layout/PageContainer';
import { LoadingState } from '@/components/ui/LoadingState';
import { ControlHeader } from '@/components/layout/ControlHeader';
import { StatusDot } from '@/components/ui/StatusBadge';
import { CopyButton } from '@/components/ui/CopyButton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ReauthError, isPermissionError } from '@/components/ui/ReauthError';
import { StatusToggle } from '@/components/ui/StatusToggle';
import { BudgetEditor } from '@/components/ui/BudgetEditor';
import { DateFilter } from '@/components/ui/DateFilter';
import { CollectionToolbar } from '@/components/ui/CollectionToolbar';
import { ScoreCard } from '@/components/optimize/ScoreCard';
import { AngleTabs } from '@/components/optimize/AngleTabs';
import { CampaignActionPreview } from '@/components/optimize/CampaignActionPreview';
import { ObjectiveAssessmentPanel } from '@/components/optimize/ObjectiveAssessmentPanel';
import { deriveCampaignKpis, formatKpi } from '@/lib/campaign-kpis';
import {
  formatCurrency,
  formatSpend,
  formatPercent,
  getCampaignStatus,
  getObjectiveLabel,
} from '@/lib/utils';
import { updateCampaignStatus, updateCampaignBudget } from '@/lib/api/mutations';
import { useToast } from '@/components/ui/Toaster';
import { GraphApiError, cacheInvalidatePrefix } from '@/lib/api/client';
import { GRAPH_API_BASE } from '@/lib/constants';
import { insightToLearningMetrics } from '@/lib/api/aiLearning';
import { upsertLearningRecord } from '@/lib/learning-store';
import type { Campaign, DatePreset, DateRange } from '@/lib/types';
import type { Recommendation } from '@/lib/types/optimize';
import type { CampaignInsight } from '@/hooks/useCampaigns';

const STATUS_PRIORITY: Record<string, number> = {
  ACTIVE: 0, PAUSED: 1, ARCHIVED: 2, DELETED: 3,
};

function sortCampaigns(campaigns: Campaign[]) {
  return [...campaigns].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 2;
    const pb = STATUS_PRIORITY[b.status] ?? 2;
    return pa - pb;
  });
}

// ─── Metric cell ──────────────────────────────────────────────────────────────
function MetricCell({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="meta-metric flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase text-text-muted">{label}</span>
      {loading ? (
        <span className="inline-block h-4 w-10 animate-pulse rounded bg-white/8" />
      ) : (
        <span className="text-sm font-black text-text-primary tabular-nums">{value}</span>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────


// ─── Mobile card ──────────────────────────────────────────────────────────────
function CampaignCard({
  campaign, accountId, accountName, currency, insight, insightsLoading, onToggleStatus,
  selected, onSelect,
}: {
  campaign: Campaign;
  accountId: string;
  accountName: string;
  currency: string;
  insight?: CampaignInsight;
  insightsLoading: boolean;
  onToggleStatus: () => void;
  selected: boolean;
  onSelect: () => void;
}) {
  const status = getCampaignStatus(campaign.status);
  const budget = campaign.daily_budget
    ? `${formatCurrency(campaign.daily_budget, currency)}/day`
    : campaign.lifetime_budget
    ? `${formatCurrency(campaign.lifetime_budget, currency)} lifetime`
    : null;
  const primaryKpi = deriveCampaignKpis(campaign.objective, insight).primary;

  return (
    <div className={`meta-item meta-item-compact ${selected ? 'meta-item-selected' : ''}`}>
      {/* Header: name + controls */}
      <div className="campaign-card-heading meta-item-header flex items-start justify-between gap-3 px-4 py-3">
        <Link href={`/accounts/${accountId}/campaigns/${campaign.id}?accountName=${encodeURIComponent(accountName)}&campaignName=${encodeURIComponent(campaign.name)}`} className="flex-1 min-w-0 active:opacity-70">
          <div className="flex items-center gap-1.5">
            <StatusDot color={status.color} />
            <p className="line-clamp-2 font-bold leading-snug text-text-primary">{campaign.name}</p>
          </div>
          <p className="meta-card-status">{status.label}<span aria-hidden="true">·</span>{getObjectiveLabel(campaign.objective)}</p>
        </Link>
        <div className="campaign-card-controls flex items-center gap-2 flex-shrink-0 pt-0.5">
          <span className="campaign-delivery-label">Delivery</span>
          <StatusToggle status={campaign.status} onToggle={async () => onToggleStatus()} />
          <label className="meta-card-select">
          <span className="campaign-select-label">Select</span>
          <input
            type="checkbox"
            aria-label={`Select ${campaign.name}`}
            checked={selected}
            onChange={onSelect}
            onClick={e => e.stopPropagation()}
            className="w-4 h-4 rounded accent-accent cursor-pointer"
          />
          </label>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="meta-compact-pad grid grid-cols-2 gap-2 px-4 py-3 min-[460px]:grid-cols-4">
        <MetricCell label="Spend"  value={formatSpend(insight?.spend, currency)}          loading={insightsLoading} />
        <MetricCell label={primaryKpi.label} value={formatKpi(primaryKpi, currency)}        loading={insightsLoading} />
        <MetricCell label="CTR"    value={insight?.ctr ? formatPercent(insight.ctr) : '—'} loading={insightsLoading} />
        <MetricCell label="CPC"    value={formatSpend(insight?.cpc, currency)}             loading={insightsLoading} />
      </div>

      {/* Budget */}
      {budget && (
        <>
          <div className="meta-budget-row meta-compact-hide border-t border-border/60 px-4 py-2">
            <span className="text-xs font-bold uppercase text-text-muted">Budget </span>
            <span className="text-xs font-semibold text-text-secondary">{budget}</span>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="meta-card-actions flex gap-2">
        <Link
          href={`/accounts/${accountId}/campaigns/${campaign.id}?accountName=${encodeURIComponent(accountName)}&campaignName=${encodeURIComponent(campaign.name)}`}
          className="meta-action meta-action-secondary flex-1"
        >
          Details
        </Link>
        <Link
          href={`/accounts/${accountId}/campaigns/${campaign.id}/adsets?accountName=${encodeURIComponent(accountName)}&currency=${encodeURIComponent(currency)}&campaignName=${encodeURIComponent(campaign.name)}`}
          className="meta-action meta-action-primary flex-1"
        >
          Ad Sets
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CampaignsPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const params = useParams<{ accountId: string }>();
  const accountId = params.accountId;
  const searchParams = useSearchParams();
  const accountName = searchParams.get('accountName') ?? accountId;
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useViewState<DatePreset | DateRange>('period', 'last_30d');
  const [search, setSearch] = useViewState('search', '');
  const [statusFilter, setStatusFilter] = useViewState('status', 'all');
  const filterSearch = useDeferredValue(search);

  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace('/login');
  }, [auth.isLoading, auth.token, router]);

  const { state, insights, insightsLoading, insightsLoaded, loadInsights, retry } = useCampaigns(accountId, auth.token, dateFilter);
  const currency = useAccountCurrency(accountId, auth.token, searchParams.get('currency') ?? undefined);
  const { state: analysisState, analyze, reset: resetAnalysis } = useCampaignAnalysis(accountId);

  const [overrides, setOverrides] = useState<Record<string, Partial<Campaign>>>({});
  const [mutationError, setMutationError] = useState<{ message: string; code?: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  usePublishAIView(dateFilter, selectedIds);
  const [pendingRecommendation, setPendingRecommendation] = useState<Recommendation | null>(null);
  const [applyingRecommendation, setApplyingRecommendation] = useState(false);
  const [targetMetric, setTargetMetric] = useState('roas');
  const [targetValue, setTargetValue] = useState('');

  // Checkbox header ref for indeterminate state
  const checkAllRef = useRef<HTMLInputElement>(null);

  function applyOverride(id: string, patch: Partial<Campaign>) {
    setOverrides(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function handleMutationError(err: unknown, rollback: () => void) {
    rollback();
    const message = err instanceof Error ? err.message : 'Update failed';
    const code = err instanceof GraphApiError ? err.code : undefined;
    if (isPermissionError(message, code)) setMutationError({ message, code });
    else toast(message, 'error');
  }

  async function handleToggleStatus(campaign: Campaign) {
    if (!auth.token) return;
    const newStatus = (overrides[campaign.id]?.status ?? campaign.status) === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    applyOverride(campaign.id, { status: newStatus });
    try {
      await updateCampaignStatus(campaign.id, newStatus, auth.token);
      toast(`Campaign ${newStatus === 'ACTIVE' ? 'activated' : 'paused'}`, 'success');
      cacheInvalidatePrefix(`${GRAPH_API_BASE}/act_${accountId}/campaigns`);
      cacheInvalidatePrefix(`${GRAPH_API_BASE}/${campaign.id}`);
      retry();
    } catch (err) {
      handleMutationError(err, () => applyOverride(campaign.id, { status: campaign.status }));
    }
  }

  async function handleSaveBudget(campaign: Campaign, value: string) {
    if (!auth.token) return;
    applyOverride(campaign.id, { daily_budget: value });
    try {
      await updateCampaignBudget(campaign.id, value, auth.token);
      toast('Budget updated', 'success');
      cacheInvalidatePrefix(`${GRAPH_API_BASE}/act_${accountId}/campaigns`);
      cacheInvalidatePrefix(`${GRAPH_API_BASE}/${campaign.id}`);
      retry();
    } catch (err) {
      handleMutationError(err, () => applyOverride(campaign.id, { daily_budget: campaign.daily_budget }));
    }
  }

  async function handleApplyRecommendation() {
    const action = pendingRecommendation?.action;
    if (!auth.token || !action || !action.canApply || action.type === 'none') return;

    const campaign = rawCampaigns.find(item => item.id === action.entityId);
    if (!campaign) {
      toast('The campaign in this recommendation is no longer available.', 'error');
      return;
    }

    setApplyingRecommendation(true);
    let rollback = () => {};

    try {
      if (action.type === 'pause_campaign' || action.type === 'activate_campaign') {
        const newStatus = action.type === 'pause_campaign' ? 'PAUSED' : 'ACTIVE';
        if (campaign.status === newStatus) {
          setPendingRecommendation(null);
          toast(`Campaign is already ${newStatus.toLowerCase()}.`, 'info');
          return;
        }
        const previousStatus = campaign.status;
        rollback = () => applyOverride(campaign.id, { status: previousStatus });
        applyOverride(campaign.id, { status: newStatus });
        await updateCampaignStatus(campaign.id, newStatus, auth.token);
      } else if (action.type === 'update_campaign_budget') {
        const currentBudget = Number(campaign.daily_budget);
        const proposedBudget = Number(action.proposedDailyBudget);
        if (!Number.isFinite(currentBudget) || currentBudget <= 0) {
          throw new Error('This campaign does not have an editable daily budget.');
        }
        if (!Number.isInteger(proposedBudget) || proposedBudget <= 0) {
          throw new Error('AI proposed an invalid daily budget.');
        }
        if (action.currentDailyBudget !== campaign.daily_budget) {
          throw new Error('The campaign budget changed after this analysis. Run the analysis again.');
        }
        const changeRatio = Math.abs(proposedBudget - currentBudget) / currentBudget;
        if (changeRatio > 0.205) {
          throw new Error('Budget change exceeds the 20% limit. Run the analysis again.');
        }

        const previousBudget = campaign.daily_budget;
        rollback = () => applyOverride(campaign.id, { daily_budget: previousBudget });
        applyOverride(campaign.id, { daily_budget: String(proposedBudget) });
        await updateCampaignBudget(campaign.id, String(proposedBudget), auth.token);
      }

      cacheInvalidatePrefix(`${GRAPH_API_BASE}/act_${accountId}/campaigns`);
      cacheInvalidatePrefix(`${GRAPH_API_BASE}/${campaign.id}`);
      const baselineContext = insightToLearningMetrics(insights[campaign.id], campaign.objective);
      const currentBudget = Number(campaign.daily_budget ?? 0);
      const proposedBudget = Number(action.proposedDailyBudget || currentBudget);
      const appliedAt = new Date().toISOString();
      upsertLearningRecord({
        id: `recommendation:${campaign.id}:${Date.now()}`, accountId, source: 'recommendation', sourceId: action.type,
        entityType: 'campaign', entityId: campaign.id, entityName: campaign.name, href: `/accounts/${accountId}/campaigns/${campaign.id}`,
        objective: campaign.objective, objectiveFamily: baselineContext.objectiveKpis.objectiveFamily,
        recommendationTitle: pendingRecommendation?.title ?? action.reason, actionType: action.type === 'update_campaign_budget' ? 'update_campaign_budget' : action.type === 'pause_campaign' ? 'pause_entity' : 'activate_entity',
        changePercent: currentBudget > 0 ? (proposedBudget - currentBudget) / currentBudget * 100 : 0,
        accepted: true, userOutcome: 'applied', appliedAt, baselineContext, checkpoints: [],
      });
      setPendingRecommendation(null);
      toast('AI recommendation applied successfully.', 'success');
      retry();
      resetAnalysis();
    } catch (error) {
      handleMutationError(error, rollback);
    } finally {
      setApplyingRecommendation(false);
    }
  }

  function handleIgnoreRecommendation() {
    const action = pendingRecommendation?.action;
    if (!action) return;
    const campaign = rawCampaigns.find(item => item.id === action.entityId);
    if (campaign) {
      const baselineContext = insightToLearningMetrics(insights[campaign.id], campaign.objective);
      const currentBudget = Number(campaign.daily_budget ?? 0);
      const proposedBudget = Number(action.proposedDailyBudget || currentBudget);
      upsertLearningRecord({
        id: `recommendation:${campaign.id}:${Date.now()}`, accountId, source: 'recommendation', sourceId: action.type,
        entityType: 'campaign', entityId: campaign.id, entityName: campaign.name, href: `/accounts/${accountId}/campaigns/${campaign.id}`,
        objective: campaign.objective, objectiveFamily: baselineContext.objectiveKpis.objectiveFamily,
        recommendationTitle: pendingRecommendation?.title ?? action.reason, actionType: action.type === 'update_campaign_budget' ? 'update_campaign_budget' : action.type === 'pause_campaign' ? 'pause_entity' : 'activate_entity',
        changePercent: currentBudget > 0 ? (proposedBudget - currentBudget) / currentBudget * 100 : 0,
        accepted: false, userOutcome: 'unknown', appliedAt: new Date().toISOString(), baselineContext, checkpoints: [],
      });
    }
    setPendingRecommendation(null);
    toast('Recommendation marked as skipped.', 'info');
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearAll() {
    setSelectedIds(new Set());
  }

  // Auto-load insights when campaigns are first loaded
  useEffect(() => {
    if (state.status === 'success' && !insightsLoaded && !insightsLoading) {
      loadInsights();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  // Reset analysis when dateFilter changes
  useEffect(() => {
    if (analysisState.step === 'done') resetAnalysis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const rawCampaigns = useMemo(() => state.status === 'success' ? state.data : [], [state]);
  const campaigns = useMemo(() => sortCampaigns(rawCampaigns.map(c => ({ ...c, ...overrides[c.id] }))), [rawCampaigns, overrides]);
  const activeCount = campaigns.filter(c => c.status === 'ACTIVE').length;
  const visibleCampaigns = useMemo(() => campaigns.filter(c => `${c.name} ${c.id}`.toLowerCase().includes(filterSearch.trim().toLowerCase()) && (statusFilter === 'all' || c.status === statusFilter)), [campaigns, filterSearch, statusFilter]);

  if (auth.isLoading || state.status === 'idle') return <PageContainer ready={false}><LoadingState message="Loading campaigns…" /></PageContainer>;

  const allSelected = visibleCampaigns.length > 0 && visibleCampaigns.every(c => selectedIds.has(c.id));
  const someSelected = visibleCampaigns.some(c => selectedIds.has(c.id)) && !allSelected;
  const selectedCampaigns = campaigns.filter(c => selectedIds.has(c.id));

  // Update indeterminate state
  if (checkAllRef.current) {
    checkAllRef.current.indeterminate = someSelected;
  }

  function handleCheckAll() {
    setSelectedIds(previous => {
      const next = new Set(previous);
      visibleCampaigns.forEach(c => { if (allSelected) next.delete(c.id); else next.add(c.id); });
      return next;
    });
  }

  return (
    <PageContainer ready={state.status === 'success' && filterSearch === search}>
      <ControlHeader
        breadcrumbs={[
          { label: 'Accounts', href: '/accounts' },
          { label: accountName, href: `/accounts/${accountId}` },
          { label: 'Campaigns' },
        ]}
        eyebrow="Campaign operations"
        title="Campaigns"
        description="Monitor delivery, review budgets and analyze performance with Meta AI."
        badge="Meta Ads AI"
        stats={state.status === 'success' ? [
          { label: 'total', value: campaigns.length, tone: 'neutral' },
          { label: 'active', value: activeCount, tone: 'green' },
          { label: 'selected', value: selectedIds.size, tone: selectedIds.size > 0 ? 'blue' : 'neutral' },
        ] : []}
      >
        {state.status === 'success' && campaigns.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <DateFilter value={dateFilter} onChange={setDateFilter} disabled={insightsLoading} />
            </div>
            {insightsLoading && (
              <svg className="h-4 w-4 flex-shrink-0 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
          </div>
        )}
      </ControlHeader>
      {state.status === 'success' && campaigns.length > 0 && <CollectionToolbar search={search} onSearch={setSearch} label="Search campaigns" placeholder="Search campaigns…" count={`${visibleCampaigns.length} of ${campaigns.length} campaigns · ${selectedIds.size} selected`} filterCount={statusFilter === 'all' ? 0 : 1} onReset={() => { setSearch(''); setStatusFilter('all'); }} filters={<label>Delivery status<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All campaigns</option><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="ARCHIVED">Archived</option><option value="DELETED">Deleted</option></select></label>} />}
      {state.status === 'success' && campaigns.length > 0 && visibleCampaigns.length === 0 && <div className="collection-empty"><h2>No matching campaigns</h2><p>Try another name, ID or delivery status.</p><button type="button" onClick={() => { setSearch(''); setStatusFilter('all'); }}>Clear filters</button></div>}

      {/* Mutation error */}
      {mutationError && (
        <div className="mb-5">
          <ReauthError message={mutationError.message} errorCode={mutationError.code} permissionHint="ads_management" onRetry={() => setMutationError(null)} />
        </div>
      )}

      {/* Loading */}
      {state.status === 'loading' && (
        <LoadingState />
      )}

      {/* Error */}
      {state.status === 'error' && (
        <ErrorState
          message={state.errorCode === 17 || state.errorCode === 80004
            ? 'Meta API rate limit reached. Please wait a few minutes and try again.'
            : state.error}
          onRetry={retry}
        />
      )}

      {/* Empty */}
      {state.status === 'success' && campaigns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-text-primary mb-1">No Campaigns Found</p>
            <p className="text-text-secondary text-sm max-w-xs">This account has no advertising campaigns.</p>
          </div>
        </div>
      )}

      {/* List */}
      {state.status === 'success' && campaigns.length > 0 && (
        <>
          {/* Mobile select-all */}
          <div className="touch-record-select flex items-center justify-end px-1 mb-2">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
              {someSelected && (
                <span className="text-xs text-text-muted">{selectedIds.size} selected</span>
              )}
              {allSelected ? 'Deselect visible' : 'Select visible'}
              <input
                type="checkbox"
                disabled={visibleCampaigns.length === 0}
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected; }}
                onChange={handleCheckAll}
                className="w-4 h-4 rounded accent-accent cursor-pointer"
              />
            </label>
          </div>

          {/* Mobile cards */}
          <div className="touch-record-list space-y-3">
            {visibleCampaigns.map(campaign => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                accountId={accountId}
                accountName={accountName}
                currency={currency}
                insight={insights[campaign.id]}
                insightsLoading={insightsLoading}
                onToggleStatus={() => handleToggleStatus(rawCampaigns.find(c => c.id === campaign.id) ?? campaign)}
                selected={selectedIds.has(campaign.id)}
                onSelect={() => toggleSelect(campaign.id)}
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="pointer-record-table glass-card gradient-border-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {/* Checkbox column */}
                    <th className="w-10 px-4 py-3.5">
                      <input
                        ref={checkAllRef}
                        type="checkbox"
                        aria-label="Select visible campaigns"
                        disabled={visibleCampaigns.length === 0}
                        checked={allSelected}
                        onChange={handleCheckAll}
                        className="w-4 h-4 rounded accent-accent cursor-pointer"
                      />
                    </th>
                    {[
                      { label: 'On/Off',      cls: 'w-14' },
                      { label: 'Campaign',    cls: '' },
                      { label: 'Budget',      cls: 'w-32' },
                      { label: 'Spend',       cls: 'w-24' },
                      { label: 'Primary KPI', cls: 'w-32' },
                      { label: 'CTR',         cls: 'w-20' },
                      { label: 'CPC',         cls: 'w-20' },
                      { label: '',            cls: 'w-28' },
                    ].map((h, i) => (
                      <th
                        key={i}
                        className={`text-left text-xs font-medium text-text-muted uppercase tracking-wide px-4 py-3.5 whitespace-nowrap ${h.cls}`}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {visibleCampaigns.map(campaign => {
                    const status = getCampaignStatus(campaign.status);
                    const insight = insights[campaign.id];
                    const budget = campaign.daily_budget
                      ? formatCurrency(campaign.daily_budget, currency)
                      : campaign.lifetime_budget
                      ? formatCurrency(campaign.lifetime_budget, currency)
                      : '—';
                    const budgetLabel = campaign.daily_budget ? '/day' : campaign.lifetime_budget ? ' lifetime' : '';
                    const isSelected = selectedIds.has(campaign.id);

                    return (
                      <tr key={campaign.id} className={`transition-colors ${isSelected ? 'bg-accent/[0.06] shadow-[inset_3px_0_0_rgb(var(--c-accent))]' : 'hover:bg-bg-secondary/55'}`}>
                        {/* Checkbox */}
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(campaign.id)}
                            className="w-4 h-4 rounded accent-accent cursor-pointer"
                          />
                        </td>

                        {/* Toggle */}
                        <td className="px-4 py-4">
                          <StatusToggle
                            status={campaign.status}
                            onToggle={() => handleToggleStatus(rawCampaigns.find(c => c.id === campaign.id) ?? campaign)}
                          />
                        </td>

                        {/* Campaign name + objective */}
                        <td className="px-4 py-4 max-w-[260px]">
                          <div className="flex items-center gap-1.5">
                            <StatusDot color={status.color} />
                            <Link
                              href={`/accounts/${accountId}/campaigns/${campaign.id}?accountName=${encodeURIComponent(accountName)}&campaignName=${encodeURIComponent(campaign.name)}`}
                              className="font-medium text-text-primary hover:text-accent transition-colors truncate"
                            >
                              {campaign.name}
                            </Link>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-text-muted">{getObjectiveLabel(campaign.objective)}</span>
                            <span className="text-border/60">·</span>
                            <code className="font-mono text-xs text-text-muted">{campaign.id}</code>
                            <CopyButton value={campaign.id} />
                          </div>
                        </td>

                        {/* Budget */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-baseline gap-0.5">
                            <BudgetEditor
                              value={campaign.daily_budget}
                              currency={currency}
                              onSave={val => handleSaveBudget(rawCampaigns.find(c => c.id === campaign.id) ?? campaign, val)}
                            />
                            {budgetLabel && !campaign.daily_budget && (
                              <span className="text-xs text-text-muted">{budget}{budgetLabel}</span>
                            )}
                          </div>
                        </td>

                        {/* Spend */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {insightsLoading ? (
                            <span className="h-4 w-14 bg-white/8 rounded animate-pulse inline-block" />
                          ) : (
                            <span className="text-sm font-medium text-text-primary tabular-nums">
                              {formatSpend(insight?.spend, currency)}
                            </span>
                          )}
                        </td>

                        {/* Objective-aware primary KPI */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {insightsLoading ? (
                            <span className="h-4 w-12 bg-white/8 rounded animate-pulse inline-block" />
                          ) : (
                            (() => {
                              const primary = deriveCampaignKpis(campaign.objective, insight).primary;
                              return <div><span className="text-sm font-semibold text-text-primary tabular-nums">{formatKpi(primary, currency)}</span><span className="block text-[10px] text-text-muted">{primary.label}</span></div>;
                            })()
                          )}
                        </td>

                        {/* CTR */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {insightsLoading ? (
                            <span className="h-4 w-10 bg-white/8 rounded animate-pulse inline-block" />
                          ) : (
                            <span className={`text-sm tabular-nums ${
                              insight?.ctr && parseFloat(insight.ctr) >= 2
                                ? 'text-status-green font-medium'
                                : insight?.ctr && parseFloat(insight.ctr) < 1
                                ? 'text-status-yellow'
                                : 'text-text-secondary'
                            }`}>
                              {insight?.ctr ? formatPercent(insight.ctr) : '—'}
                            </span>
                          )}
                        </td>

                        {/* CPC */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {insightsLoading ? (
                            <span className="h-4 w-10 bg-white/8 rounded animate-pulse inline-block" />
                          ) : (
                            <span className="text-sm text-text-secondary tabular-nums">
                              {formatSpend(insight?.cpc, currency)}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/accounts/${accountId}/campaigns/${campaign.id}/adsets?accountName=${encodeURIComponent(accountName)}&currency=${encodeURIComponent(currency)}&campaignName=${encodeURIComponent(campaign.name)}`}
                              className="text-xs font-medium text-accent hover:text-accent/80 bg-accent/10 hover:bg-accent/15 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                            >
                              Ad Sets
                            </Link>
                            <Link
                              href={`/accounts/${accountId}/campaigns/${campaign.id}?accountName=${encodeURIComponent(accountName)}&campaignName=${encodeURIComponent(campaign.name)}`}
                              className="text-text-muted hover:text-text-primary transition-colors p-1"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                              </svg>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-3 text-text-muted text-xs text-right">
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
          </p>
        </>
      )}

      {/* Analysis modal */}
      {analysisState.step !== 'idle' && (
        <Modal open label="AI analysis" onClose={resetAnalysis} busy={analysisState.step === 'analyzing'}>
          {/* Panel */}
          <div className="relative w-full sm:max-w-2xl max-h-[90dvh] flex flex-col bg-bg-card border border-border rounded-t-lg sm:rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-accent text-lg leading-none">✦</span>
                <h2 className="text-base font-semibold text-text-primary">Meta AI analysis</h2>
              </div>
              {analysisState.step !== 'analyzing' && (
                <button
                  onClick={resetAnalysis}
                  aria-label="Close AI analysis"
                  className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-white/5"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1">
              {/* Analyzing state */}
              {analysisState.step === 'analyzing' && (
                <div className="flex flex-col items-center justify-center py-16 px-6 gap-5">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-accent/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-accent text-xl leading-none">✦</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-text-primary font-semibold mb-1">Analyzing campaigns...</p>
                    <p className="text-text-muted text-sm">Meta AI is analyzing your campaign data</p>
                  </div>
                </div>
              )}

              {/* Error state */}
              {analysisState.step === 'error' && (
                <div className="p-5">
                  <div className="bg-status-red/10 border border-status-red/30 rounded-2xl px-4 py-4 flex items-start gap-3">
                    <svg className="w-5 h-5 text-status-red flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <p className="text-status-red text-sm">{analysisState.error}</p>
                  </div>
                </div>
              )}

              {/* Done state */}
              {analysisState.step === 'done' && analysisState.analysis && (
                <div className="p-5 space-y-4">
                  <ScoreCard
                    score={analysisState.analysis.overallScore}
                    summary={analysisState.analysis.summary}
                  />
                  <ObjectiveAssessmentPanel assessments={analysisState.analysis.objectiveAssessments} />
                  <AngleTabs
                    angles={analysisState.analysis.angles}
                    onPreviewAction={setPendingRecommendation}
                  />
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Action bar */}
      {selectedIds.size > 0 && (
        <div className="mobile-selection-bar sticky bottom-4 flex justify-center mt-4 pointer-events-none">
          <div className="pointer-events-auto bg-bg-card border border-border rounded-2xl px-4 py-3 flex flex-wrap items-center justify-center gap-2 shadow-lg">
            <select
              value={targetMetric}
              onChange={event => setTargetMetric(event.target.value)}
              className="rounded-lg border border-border bg-bg-secondary px-2.5 py-2 text-xs text-text-primary"
              aria-label="Target KPI"
            >
              <option value="roas">ROAS target</option>
              <option value="cpa">CPA target</option>
              <option value="cpl">CPL target</option>
              <option value="cost_per_lpv">Cost / LPV target</option>
              <option value="cost_per_engagement">Cost / engagement target</option>
              <option value="cost_per_thruplay">Cost / ThruPlay target</option>
              <option value="cpm">CPM target</option>
            </select>
            <input
              type="number"
              min="0"
              step="any"
              value={targetValue}
              onChange={event => setTargetValue(event.target.value)}
              placeholder="Optional value"
              inputMode="decimal"
              aria-label="Optional target KPI value"
              className="w-28 rounded-lg border border-border bg-bg-secondary px-2.5 py-2 text-xs text-text-primary placeholder:text-text-muted"
            />
            <button
              onClick={() => analyze(
                selectedCampaigns,
                insights,
                currency,
                dateFilter,
                auth.token,
                targetValue && Number(targetValue) >= 0 ? { metric: targetMetric, value: Number(targetValue) } : undefined,
              )}
              disabled={!insightsLoaded || analysisState.step === 'analyzing'}
              title={!insightsLoaded ? 'Load metrics first' : undefined}
              className="selection-analyze flex items-center gap-1.5 px-3 py-2 bg-text-primary text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-opacity"
            >
              Analyze with Meta AI ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      <CampaignActionPreview
        recommendation={pendingRecommendation}
        currency={currency}
        applying={applyingRecommendation}
        onApply={handleApplyRecommendation}
        onIgnore={handleIgnoreRecommendation}
        onClose={() => setPendingRecommendation(null)}
      />
    </PageContainer>
  );
}

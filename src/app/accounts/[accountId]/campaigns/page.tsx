'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useAccountCurrency } from '@/hooks/useAccountCurrency';
import { useCampaignAnalysis } from '@/hooks/useCampaignAnalysis';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatusDot } from '@/components/ui/StatusBadge';
import { CopyButton } from '@/components/ui/CopyButton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ReauthError, isPermissionError } from '@/components/ui/ReauthError';
import { StatusToggle } from '@/components/ui/StatusToggle';
import { BudgetEditor } from '@/components/ui/BudgetEditor';
import { DateFilter } from '@/components/ui/DateFilter';
import { ScoreCard } from '@/components/optimize/ScoreCard';
import { AngleTabs } from '@/components/optimize/AngleTabs';
import {
  formatCurrency,
  formatSpend,
  formatCompact,
  formatPercent,
  getCampaignStatus,
  getObjectiveLabel,
} from '@/lib/utils';
import { updateCampaignStatus, updateCampaignBudget } from '@/lib/api/mutations';
import { useToast } from '@/components/ui/Toaster';
import { GraphApiError, cacheInvalidatePrefix } from '@/lib/api/client';
import { GRAPH_API_BASE } from '@/lib/constants';
import type { Campaign, DatePreset, DateRange } from '@/lib/types';
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
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-text-muted uppercase tracking-wide">{label}</span>
      {loading ? (
        <span className="h-4 w-10 bg-white/8 rounded animate-pulse inline-block" />
      ) : (
        <span className="text-sm font-semibold text-text-primary tabular-nums">{value}</span>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-pulse">
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-white/8 rounded w-3/4" />
          <div className="h-3 bg-white/5 rounded w-1/3" />
        </div>
        <div className="h-5 w-16 bg-white/8 rounded-full" />
      </div>
      <div className="mx-4 border-t border-border/40" />
      <div className="grid grid-cols-4 gap-3 px-4 py-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 bg-white/5 rounded w-8" />
            <div className="h-4 bg-white/8 rounded w-12" />
          </div>
        ))}
      </div>
      <div className="mx-4 border-t border-border/40" />
      <div className="flex">
        <div className="flex-1 h-10 bg-white/5" />
        <div className="w-px bg-border/40" />
        <div className="flex-1 h-10 bg-white/5" />
      </div>
    </div>
  );
}

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

  return (
    <div className={`bg-bg-card border rounded-2xl overflow-hidden transition-colors ${selected ? 'border-accent/60' : 'border-border'}`}>
      {/* Header: name + controls */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <Link href={`/accounts/${accountId}/campaigns/${campaign.id}?accountName=${encodeURIComponent(accountName)}&campaignName=${encodeURIComponent(campaign.name)}`} className="flex-1 min-w-0 active:opacity-70">
          <div className="flex items-center gap-1.5">
            <StatusDot color={status.color} />
            <p className="font-semibold text-text-primary leading-snug line-clamp-2">{campaign.name}</p>
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">{getObjectiveLabel(campaign.objective)}</p>
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          <StatusToggle status={campaign.status} onToggle={async () => onToggleStatus()} />
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            onClick={e => e.stopPropagation()}
            className="w-4 h-4 rounded accent-accent cursor-pointer"
          />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="mx-4 border-t border-border/40" />
      <div className="grid grid-cols-4 gap-3 px-4 py-3">
        <MetricCell label="Spend"  value={formatSpend(insight?.spend, currency)}          loading={insightsLoading} />
        <MetricCell label="Impr"   value={formatCompact(insight?.impressions)}             loading={insightsLoading} />
        <MetricCell label="CTR"    value={insight?.ctr ? formatPercent(insight.ctr) : '—'} loading={insightsLoading} />
        <MetricCell label="CPC"    value={formatSpend(insight?.cpc, currency)}             loading={insightsLoading} />
      </div>

      {/* Budget */}
      {budget && (
        <>
          <div className="mx-4 border-t border-border/40" />
          <div className="px-4 py-2">
            <span className="text-xs text-text-muted">Budget: </span>
            <span className="text-xs font-medium text-text-secondary">{budget}</span>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="mx-4 border-t border-border/40" />
      <div className="flex">
        <Link
          href={`/accounts/${accountId}/campaigns/${campaign.id}?accountName=${encodeURIComponent(accountName)}&campaignName=${encodeURIComponent(campaign.name)}`}
          className="flex-1 flex items-center justify-center py-3 text-text-secondary text-sm hover:bg-white/[0.03] active:bg-white/5 transition-colors"
        >
          Details
        </Link>
        <div className="w-px bg-border/50" />
        <Link
          href={`/accounts/${accountId}/campaigns/${campaign.id}/adsets?accountName=${encodeURIComponent(accountName)}&currency=${encodeURIComponent(currency)}&campaignName=${encodeURIComponent(campaign.name)}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-accent text-sm font-semibold hover:bg-accent/5 active:bg-accent/10 transition-colors"
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
  const [dateFilter, setDateFilter] = useState<DatePreset | DateRange>('last_30d');

  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace('/');
  }, [auth.isLoading, auth.token, router]);

  const { state, insights, insightsLoading, insightsLoaded, loadInsights, retry } = useCampaigns(accountId, auth.token, dateFilter);
  const currency = useAccountCurrency(accountId, auth.token, searchParams.get('currency') ?? undefined);
  const { state: analysisState, analyze, reset: resetAnalysis } = useCampaignAnalysis(accountId);

  const [overrides, setOverrides] = useState<Record<string, Partial<Campaign>>>({});
  const [mutationError, setMutationError] = useState<{ message: string; code?: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  if (auth.isLoading || state.status === 'idle') return null;

  const rawCampaigns = state.status === 'success' ? state.data : [];
  const campaigns = sortCampaigns(rawCampaigns.map(c => ({ ...c, ...overrides[c.id] })));
  const activeCount = campaigns.filter(c => c.status === 'ACTIVE').length;

  const allSelected = campaigns.length > 0 && campaigns.every(c => selectedIds.has(c.id));
  const someSelected = campaigns.some(c => selectedIds.has(c.id)) && !allSelected;
  const selectedCampaigns = campaigns.filter(c => selectedIds.has(c.id));

  // Update indeterminate state
  if (checkAllRef.current) {
    checkAllRef.current.indeterminate = someSelected;
  }

  function handleCheckAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(campaigns.map(c => c.id)));
    }
  }

  return (
    <PageContainer>
      {/* Campaign mission header */}
      <section className="neo-panel relative mb-6 overflow-hidden p-5 sm:p-7">
        <div className="absolute right-[-4rem] top-[-6rem] h-56 w-56 rounded-full bg-accent/35 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-[32%] h-48 w-48 rounded-full bg-status-green/25 blur-3xl" />

        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/accounts"
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white/70 hover:text-white"
            >
              Accounts
            </Link>
            <span className="text-white/30">/</span>
            <Link
              href={`/accounts/${accountId}`}
              className="max-w-[220px] truncate rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white/70 hover:text-white"
            >
              {accountName}
            </Link>
            <span className="text-white/30">/</span>
            <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white">
              Campaign room
            </span>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/55">
                Campaign operations
              </p>
              <h1 className="mt-2 text-4xl font-black leading-[0.95] text-white sm:text-6xl">
                Delivery board
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/68 sm:text-base">
                Monitor status, budget movement, delivery metrics, and AI review signals for this ad account.
              </p>
            </div>

            {state.status === 'success' && (
              <div className="grid grid-cols-2 gap-2 sm:w-[260px]">
                <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-3xl font-black text-white tabular-nums">{campaigns.length}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/55">total</p>
                </div>
                <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-3xl font-black text-white tabular-nums">{activeCount}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-white/55">active</p>
                </div>
              </div>
            )}
          </div>

          {state.status === 'success' && campaigns.length > 0 && (
            <div className="mt-5 flex items-center gap-2 rounded-[1.5rem] border border-white/15 bg-white/10 p-2 backdrop-blur">
              <div className="flex-1">
                <DateFilter value={dateFilter} onChange={setDateFilter} disabled={insightsLoading} />
              </div>
              {insightsLoading && (
                <svg className="h-4 w-4 flex-shrink-0 animate-spin text-white/60" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Mutation error */}
      {mutationError && (
        <div className="mb-5">
          <ReauthError message={mutationError.message} errorCode={mutationError.code} permissionHint="ads_management" onRetry={() => setMutationError(null)} />
        </div>
      )}

      {/* Loading */}
      {state.status === 'loading' && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
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
          <div className="sm:hidden flex items-center justify-end px-1 mb-2">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
              {someSelected && (
                <span className="text-xs text-text-muted">{selectedIds.size} selected</span>
              )}
              {allSelected ? 'Deselect all' : 'Select all'}
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected; }}
                onChange={handleCheckAll}
                className="w-4 h-4 rounded accent-accent cursor-pointer"
              />
            </label>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {campaigns.map(campaign => (
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
          <div className="hidden sm:block glass-card gradient-border-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {/* Checkbox column */}
                    <th className="w-10 px-4 py-3.5">
                      <input
                        ref={checkAllRef}
                        type="checkbox"
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
                      { label: 'Impressions', cls: 'w-24' },
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
                  {campaigns.map(campaign => {
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
                      <tr key={campaign.id} className={`transition-colors ${isSelected ? 'bg-accent/[0.04]' : 'hover:bg-white/[0.02]'}`}>
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

                        {/* Impressions */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {insightsLoading ? (
                            <span className="h-4 w-12 bg-white/8 rounded animate-pulse inline-block" />
                          ) : (
                            <span className="text-sm text-text-secondary tabular-nums">
                              {formatCompact(insight?.impressions)}
                            </span>
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={analysisState.step === 'analyzing' ? undefined : resetAnalysis}
          />

          {/* Panel */}
          <div className="relative w-full sm:max-w-2xl max-h-[90dvh] flex flex-col bg-bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-accent text-lg leading-none">✦</span>
                <h2 className="text-base font-semibold text-text-primary">AI Analysis</h2>
              </div>
              {analysisState.step !== 'analyzing' && (
                <button
                  onClick={resetAnalysis}
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
                    <p className="text-text-primary font-semibold mb-1">Analyzing campaigns…</p>
                    <p className="text-text-muted text-sm">AI is processing your campaign data</p>
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
                  <AngleTabs angles={analysisState.analysis.angles} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 flex justify-center mt-4 pointer-events-none">
          <div className="pointer-events-auto bg-bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
            <button
              onClick={() => analyze(selectedCampaigns, insights, currency, dateFilter)}
              disabled={!insightsLoaded || analysisState.step === 'analyzing'}
              title={!insightsLoaded ? 'Load metrics first' : undefined}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-opacity"
            >
              ✦ Analyze {selectedIds.size} campaign{selectedIds.size > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useAdSets } from '@/hooks/useAdSets';
import { useAccountCurrency } from '@/hooks/useAccountCurrency';
import { useAdSetAnalysis } from '@/hooks/useAdSetAnalysis';
import { PageContainer } from '@/components/layout/PageContainer';
import { ControlHeader } from '@/components/layout/ControlHeader';
import { StatusDot } from '@/components/ui/StatusBadge';
import { CopyButton } from '@/components/ui/CopyButton';
import { ErrorState } from '@/components/ui/ErrorState';
import { ReauthError, isPermissionError } from '@/components/ui/ReauthError';
import { StatusToggle } from '@/components/ui/StatusToggle';
import { DateFilter } from '@/components/ui/DateFilter';
import { ScoreCard } from '@/components/optimize/ScoreCard';
import { AngleTabs } from '@/components/optimize/AngleTabs';
import { updateAdSetStatus } from '@/lib/api/mutations';
import { useToast } from '@/components/ui/Toaster';
import { GraphApiError, cacheInvalidatePrefix } from '@/lib/api/client';
import { GRAPH_API_BASE } from '@/lib/constants';
import {
  formatCurrency,
  formatSpend,
  formatCompact,
  formatPercent,
  getAdSetStatus,
} from '@/lib/utils';
import type { AdSet, DatePreset, DateRange } from '@/lib/types';
import type { AdSetInsight } from '@/hooks/useAdSets';

const STATUS_PRIORITY: Record<string, number> = {
  ACTIVE: 0, PAUSED: 1, ARCHIVED: 2, DELETED: 3,
};

function sortAdSets(adsets: AdSet[]) {
  return [...adsets].sort((a, b) => {
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
function AdSetCard({
  adset, accountId, campaignId, accountName, campaignName, currency, insight, insightsLoading, onToggleStatus,
  selected, onSelect,
}: {
  adset: AdSet;
  accountId: string;
  campaignId: string;
  accountName: string;
  campaignName: string;
  currency: string;
  insight?: AdSetInsight;
  insightsLoading: boolean;
  onToggleStatus: () => void;
  selected: boolean;
  onSelect: () => void;
}) {
  const status = getAdSetStatus(adset.status);
  const budget = adset.daily_budget
    ? `${formatCurrency(adset.daily_budget, currency)}/day`
    : null;

  return (
    <div className={`meta-item meta-item-compact ${selected ? 'meta-item-selected' : ''}`}>
      {/* Header: name + controls */}
      <div className="meta-item-header flex items-start justify-between gap-3 px-4 py-3">
        <Link href={`/accounts/${accountId}/campaigns/${campaignId}/adsets/${adset.id}?accountName=${encodeURIComponent(accountName)}&campaignName=${encodeURIComponent(campaignName)}&adsetName=${encodeURIComponent(adset.name)}`} className="flex-1 min-w-0 active:opacity-70">
          <div className="flex items-center gap-1.5">
            <StatusDot color={status.color} />
            <p className="line-clamp-2 font-bold leading-snug text-text-primary">{adset.name}</p>
          </div>
          <code className="mt-1 block truncate font-mono text-[11px] text-text-muted">{adset.id}</code>
        </Link>
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          <StatusToggle status={adset.status} onToggle={async () => onToggleStatus()} />
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
      <div className="meta-compact-pad grid grid-cols-2 gap-2 px-4 py-3 min-[460px]:grid-cols-4">
        <MetricCell label="Spend"  value={formatSpend(insight?.spend, currency)}           loading={insightsLoading} />
        <MetricCell label="Impr"   value={formatCompact(insight?.impressions)}              loading={insightsLoading} />
        <MetricCell label="CTR"    value={insight?.ctr ? formatPercent(insight.ctr) : '—'} loading={insightsLoading} />
        <MetricCell label="CPC"    value={formatSpend(insight?.cpc, currency)}              loading={insightsLoading} />
      </div>

      {/* Budget */}
      {budget && (
        <>
          <div className="meta-compact-hide border-t border-border/60 px-4 py-2">
            <span className="text-xs font-bold uppercase text-text-muted">Budget </span>
            <span className="text-xs font-semibold text-text-secondary">{budget}</span>
          </div>
        </>
      )}

      {/* Action */}
      <div className="border-t border-border" />
      <Link
        href={`/accounts/${accountId}/campaigns/${campaignId}/adsets/${adset.id}?accountName=${encodeURIComponent(accountName)}&campaignName=${encodeURIComponent(campaignName)}&adsetName=${encodeURIComponent(adset.name)}`}
        className="meta-action w-full rounded-none text-accent hover:bg-accent/5 active:bg-accent/10"
      >
        View Details
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdSetsPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const params = useParams<{ accountId: string; campaignId: string }>();
  const { accountId, campaignId } = params;
  const searchParams = useSearchParams();
  const accountName = searchParams.get('accountName') ?? accountId;
  const campaignName = searchParams.get('campaignName') ?? campaignId;
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState<DatePreset | DateRange>('last_30d');

  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace('/login');
  }, [auth.isLoading, auth.token, router]);

  const { state, insights, insightsLoading, insightsLoaded, loadInsights, retry } = useAdSets(campaignId, auth.token, dateFilter);
  const currency = useAccountCurrency(accountId, auth.token, searchParams.get('currency') ?? undefined);
  const { state: analysisState, analyze, reset: resetAnalysis } = useAdSetAnalysis(campaignId);

  const [overrides, setOverrides] = useState<Record<string, Partial<AdSet>>>({});
  const [mutationError, setMutationError] = useState<{ message: string; code?: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const checkAllRef = useRef<HTMLInputElement>(null);

  function applyOverride(id: string, patch: Partial<AdSet>) {
    setOverrides(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function handleMutationError(err: unknown, rollback: () => void) {
    rollback();
    const message = err instanceof Error ? err.message : 'Update failed';
    const code = err instanceof GraphApiError ? err.code : undefined;
    if (isPermissionError(message, code)) setMutationError({ message, code });
    else toast(message, 'error');
  }

  async function handleToggleStatus(adset: AdSet) {
    if (!auth.token) return;
    const newStatus = (overrides[adset.id]?.status ?? adset.status) === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    applyOverride(adset.id, { status: newStatus });
    try {
      await updateAdSetStatus(adset.id, newStatus, auth.token);
      toast(`Ad set ${newStatus === 'ACTIVE' ? 'activated' : 'paused'}`, 'success');
      cacheInvalidatePrefix(`${GRAPH_API_BASE}/${campaignId}/adsets`);
      cacheInvalidatePrefix(`${GRAPH_API_BASE}/${adset.id}`);
      retry();
    } catch (err) {
      handleMutationError(err, () => applyOverride(adset.id, { status: adset.status }));
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

  // Auto-load insights when adsets are first loaded
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

  const rawAdSets = state.status === 'success' ? state.data : [];
  const adsets = sortAdSets(rawAdSets.map(a => ({ ...a, ...overrides[a.id] })));
  const activeCount = adsets.filter(a => a.status === 'ACTIVE').length;

  const allSelected = adsets.length > 0 && adsets.every(a => selectedIds.has(a.id));
  const someSelected = adsets.some(a => selectedIds.has(a.id)) && !allSelected;
  const selectedAdSets = adsets.filter(a => selectedIds.has(a.id));

  if (checkAllRef.current) {
    checkAllRef.current.indeterminate = someSelected;
  }

  function handleCheckAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(adsets.map(a => a.id)));
    }
  }

  return (
    <PageContainer>
      <ControlHeader
        breadcrumbs={[
            { label: 'Accounts', href: '/accounts' },
            { label: accountName, href: `/accounts/${accountId}` },
            { label: 'Campaigns', href: `/accounts/${accountId}/campaigns` },
            { label: campaignName, href: `/accounts/${accountId}/campaigns/${campaignId}` },
            { label: 'Ad Sets' },
        ]}
        eyebrow="Ad set operations"
        title="Targeting board"
        description={state.status === 'success' && activeCount > 0
          ? `${activeCount} active ad set${activeCount !== 1 ? 's' : ''}. Review delivery, targeting, budget, and GPT optimization signals.`
          : 'Review delivery, targeting, budget, and GPT optimization signals for this campaign.'}
        badge="Meta Ads + GPT"
        stats={state.status === 'success' ? [
          { label: 'total', value: adsets.length, tone: 'neutral' },
          { label: 'active', value: activeCount, tone: 'green' },
          { label: 'selected', value: selectedIds.size, tone: selectedIds.size > 0 ? 'blue' : 'neutral' },
        ] : []}
      >
        {/* Date filter */}
        {state.status === 'success' && adsets.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-80">
                <DateFilter value={dateFilter} onChange={setDateFilter} disabled={insightsLoading} />
            </div>
            {insightsLoading && (
              <svg className="w-4 h-4 text-accent animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
          </div>
        )}
      </ControlHeader>

      {/* Mutation error */}
      {mutationError && (
        <div className="mb-5">
          <ReauthError message={mutationError.message} errorCode={mutationError.code} permissionHint="ads_management" onRetry={() => setMutationError(null)} />
        </div>
      )}

      {/* Loading */}
      {state.status === 'loading' && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
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
      {state.status === 'success' && adsets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-text-primary mb-1">No Ad Sets Found</p>
            <p className="text-text-secondary text-sm max-w-xs">This campaign has no ad sets.</p>
          </div>
        </div>
      )}

      {/* List */}
      {state.status === 'success' && adsets.length > 0 && (
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
            {adsets.map(adset => (
              <AdSetCard
                key={adset.id}
                adset={adset}
                accountId={accountId}
                campaignId={campaignId}
                accountName={accountName}
                campaignName={campaignName}
                currency={currency}
                insight={insights[adset.id]}
                insightsLoading={insightsLoading}
                onToggleStatus={() => handleToggleStatus(rawAdSets.find(a => a.id === adset.id) ?? adset)}
                selected={selectedIds.has(adset.id)}
                onSelect={() => toggleSelect(adset.id)}
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block glass-card gradient-border-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
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
                      { label: 'Ad Set',      cls: '' },
                      { label: 'Budget',      cls: 'w-28' },
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
                  {adsets.map(adset => {
                    const status = getAdSetStatus(adset.status);
                    const insight = insights[adset.id];
                    const isSelected = selectedIds.has(adset.id);
                    return (
                      <tr key={adset.id} className={`transition-colors ${isSelected ? 'bg-accent/[0.06] shadow-[inset_3px_0_0_rgb(var(--c-accent))]' : 'hover:bg-bg-secondary/55'}`}>
                        {/* Checkbox */}
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(adset.id)}
                            className="w-4 h-4 rounded accent-accent cursor-pointer"
                          />
                        </td>

                        {/* Toggle */}
                        <td className="px-4 py-4">
                          <StatusToggle
                            status={adset.status}
                            onToggle={() => handleToggleStatus(rawAdSets.find(a => a.id === adset.id) ?? adset)}
                          />
                        </td>

                        {/* Ad set name + goal + ID */}
                        <td className="px-4 py-4 max-w-[260px]">
                          <div className="flex items-center gap-1.5">
                            <StatusDot color={status.color} />
                            <Link
                              href={`/accounts/${accountId}/campaigns/${campaignId}/adsets/${adset.id}?accountName=${encodeURIComponent(accountName)}&campaignName=${encodeURIComponent(campaignName)}&adsetName=${encodeURIComponent(adset.name)}`}
                              className="font-medium text-text-primary hover:text-accent transition-colors truncate"
                            >
                              {adset.name}
                            </Link>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <code className="font-mono text-xs text-text-muted">{adset.id}</code>
                            <CopyButton value={adset.id} />
                          </div>
                        </td>

                        {/* Budget */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-text-primary">
                          {adset.daily_budget
                            ? <>{formatCurrency(adset.daily_budget, currency)}<span className="text-text-muted text-xs">/day</span></>
                            : '—'}
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
                              href={`/accounts/${accountId}/campaigns/${campaignId}/adsets/${adset.id}?accountName=${encodeURIComponent(accountName)}&campaignName=${encodeURIComponent(campaignName)}&adsetName=${encodeURIComponent(adset.name)}`}
                              className="text-xs font-medium text-accent hover:text-accent/80 bg-accent/10 hover:bg-accent/15 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                            >
                              Ads
                            </Link>
                            <Link
                              href={`/accounts/${accountId}/campaigns/${campaignId}/adsets/${adset.id}?accountName=${encodeURIComponent(accountName)}&campaignName=${encodeURIComponent(campaignName)}&adsetName=${encodeURIComponent(adset.name)}`}
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
            {adsets.length} ad set{adsets.length !== 1 ? 's' : ''}
          </p>
        </>
      )}

      {/* Analysis modal */}
      {analysisState.step !== 'idle' && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={analysisState.step === 'analyzing' ? undefined : resetAnalysis}
          />

          {/* Panel */}
          <div className="relative w-full sm:max-w-2xl max-h-[90dvh] flex flex-col bg-bg-card border border-border rounded-t-lg sm:rounded-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-accent text-lg leading-none">✦</span>
                <h2 className="text-base font-semibold text-text-primary">GPT Analysis</h2>
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
                    <p className="text-text-primary font-semibold mb-1">Analyzing ad sets...</p>
                    <p className="text-text-muted text-sm">GPT is processing your ad set data</p>
                  </div>
                </div>
              )}

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
              onClick={() => analyze(selectedAdSets, insights, currency, dateFilter)}
              disabled={!insightsLoaded || analysisState.step === 'analyzing'}
              title={!insightsLoaded ? 'Load metrics first' : undefined}
              className="flex items-center gap-1.5 px-3 py-2 bg-text-primary text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-opacity"
            >
              Analyze with GPT ({selectedIds.size})
            </button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

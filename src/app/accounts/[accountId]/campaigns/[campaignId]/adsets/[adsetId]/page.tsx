'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdSetDetail } from '@/hooks/useAdSetDetail';
import { useAds } from '@/hooks/useAds';
import { useAccountCurrency } from '@/hooks/useAccountCurrency';
import { useAdSetAnalysis } from '@/hooks/useAdSetAnalysis';
import { useDailyInsights } from '@/hooks/useDailyInsights';
import { CampaignChart } from '@/components/ui/CampaignChart';
import { PageContainer } from '@/components/layout/PageContainer';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DetailInfoGrid } from '@/components/ui/DetailInfoGrid';
import { InsightsPanel } from '@/components/ui/InsightsPanel';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScoreCard } from '@/components/optimize/ScoreCard';
import { AngleTabs } from '@/components/optimize/AngleTabs';
import {
  formatCurrency,
  formatDate,
  getAdSetStatus,
  getOptGoalLabel,
  getBillingEventLabel,
  getBidStrategyLabel,
  getAdStatus,
  getEffectiveAdStatus,
  getCtaLabel,
} from '@/lib/utils';
import type { DatePreset, DateRange } from '@/lib/types';

export default function AdSetDetailPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const params = useParams<{ accountId: string; campaignId: string; adsetId: string }>();
  const { accountId, campaignId, adsetId } = params;
  const searchParams = useSearchParams();
  const accountName = searchParams.get('accountName') ?? accountId;
  const campaignName = searchParams.get('campaignName') ?? campaignId;

  useEffect(() => {
    if (!auth.isLoading && !auth.token) {
      router.replace('/');
    }
  }, [auth.isLoading, auth.token, router]);

  const { state, retry } = useAdSetDetail(adsetId, auth.token);
  const { state: adsState } = useAds(adsetId, auth.token);
  const currency = useAccountCurrency(accountId, auth.token);
  const { state: analysisState, analyze, reset: resetAnalysis } = useAdSetAnalysis(campaignId);
  const [dateFilter, setDateFilter] = useState<DatePreset | DateRange>('last_30d');
  const { state: chartState, aggregateState } = useDailyInsights(adsetId, dateFilter, 'adset', auth.token);

  // Reset analysis when date filter changes
  useEffect(() => {
    if (analysisState.step === 'done') resetAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  if (auth.isLoading || state.status === 'idle') return null;

  return (
    <PageContainer>
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: 'Accounts', href: '/accounts' },
            { label: accountName, href: `/accounts/${accountId}` },
            { label: 'Campaigns', href: `/accounts/${accountId}/campaigns` },
            { label: campaignName, href: `/accounts/${accountId}/campaigns/${campaignId}` },
            { label: 'Ad Sets', href: `/accounts/${accountId}/campaigns/${campaignId}/adsets` },
            { label: searchParams.get('adsetName') ?? (state.status === 'success' ? state.data.name : adsetId) },
          ]}
        />
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-3">
          Ad Set Details
        </h1>
      </div>

      {state.status === 'loading' && <LoadingState message="Loading ad set info..." />}

      {state.status === 'error' && (
        <ErrorState message={state.error} onRetry={retry} />
      )}

      {state.status === 'success' && (
        <div className="space-y-6">
          {/* Info card */}
          <div className="glass-card gradient-border-card rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-text-primary truncate">{state.data.name}</h2>
                <code className="font-mono text-xs text-text-muted">{state.data.id}</code>
              </div>
              <StatusBadge
                label={getAdSetStatus(state.data.status).label}
                color={getAdSetStatus(state.data.status).color}
              />
            </div>

            <DetailInfoGrid
              items={[
                {
                  label: 'Opt. Goal',
                  value: state.data.optimization_goal
                    ? getOptGoalLabel(state.data.optimization_goal)
                    : '—',
                },
                {
                  label: 'Billing Event',
                  value: state.data.billing_event
                    ? getBillingEventLabel(state.data.billing_event)
                    : '—',
                },
                {
                  label: 'Bid Strategy',
                  value: state.data.bid_strategy
                    ? getBidStrategyLabel(state.data.bid_strategy)
                    : '—',
                },
                {
                  label: 'Daily Budget',
                  value: state.data.daily_budget
                    ? formatCurrency(state.data.daily_budget, currency)
                    : '—',
                },
                {
                  label: 'Lifetime Budget',
                  value: state.data.lifetime_budget
                    ? formatCurrency(state.data.lifetime_budget, currency)
                    : '—',
                },
                { label: 'Start Date', value: formatDate(state.data.start_time) },
                { label: 'End Date', value: formatDate(state.data.end_time) },
              ]}
            />
          </div>

          {/* Targeting */}
          {state.data.targeting && (
            <div className="glass-card gradient-border-card rounded-2xl p-5">
              <h2 className="text-base font-semibold text-text-primary mb-4">Targeting</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(state.data.targeting.age_min || state.data.targeting.age_max) && (
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Age</p>
                    <p className="text-text-primary text-sm font-medium">
                      {state.data.targeting.age_min ?? '—'} – {state.data.targeting.age_max ?? '—'}
                    </p>
                  </div>
                )}
                {state.data.targeting.genders && state.data.targeting.genders.length > 0 && (
                  <div>
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Gender</p>
                    <p className="text-text-primary text-sm font-medium">
                      {state.data.targeting.genders
                        .map((g) => (g === 1 ? 'Male' : g === 2 ? 'Female' : `${g}`))
                        .join(', ')}
                    </p>
                  </div>
                )}
                {state.data.targeting.geo_locations?.countries &&
                  state.data.targeting.geo_locations.countries.length > 0 && (
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Countries</p>
                      <p className="text-text-primary text-sm font-medium">
                        {state.data.targeting.geo_locations.countries.join(', ')}
                      </p>
                    </div>
                  )}
                {state.data.targeting.geo_locations?.cities &&
                  state.data.targeting.geo_locations.cities.length > 0 && (
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Cities</p>
                      <p className="text-text-primary text-sm font-medium">
                        {state.data.targeting.geo_locations.cities.map((c) => c.name).join(', ')}
                      </p>
                    </div>
                  )}
                {state.data.targeting.geo_locations?.regions &&
                  state.data.targeting.geo_locations.regions.length > 0 && (
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Regions</p>
                      <p className="text-text-primary text-sm font-medium">
                        {state.data.targeting.geo_locations.regions.map((r) => r.name).join(', ')}
                      </p>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Insights */}
          <div className="glass-card gradient-border-card rounded-2xl p-4">
            <InsightsPanel
              objectId={adsetId}
              level="adset"
              currency={currency}
              token={auth.token}
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
              externalState={aggregateState}
            />
          </div>

          {/* Daily Chart */}
          <CampaignChart
            data={chartState.status === 'success' ? chartState.data : []}
            currency={currency}
            loading={chartState.status === 'loading' || chartState.status === 'idle'}
            dateFilter={dateFilter}
          />

          {/* AI Analysis */}
          <div className="glass-card gradient-border-card rounded-2xl p-5">
            <h3 className="text-base font-semibold text-text-primary mb-1">AI Analysis</h3>
            {analysisState.step === 'idle' && (
              <>
                <p className="text-text-secondary text-sm mb-4">
                  Get AI-powered analysis of your ad set — targeting effectiveness, bid strategy, and optimization recommendations.
                </p>
                <button
                  onClick={() => {
                    const { id, name, status, optimization_goal, billing_event, daily_budget, targeting } = state.data;
                    analyze([{ id, name, status, optimization_goal, billing_event, daily_budget }], aggregateState.status === 'success' ? { [id]: { adset_id: id, ...aggregateState.data } } : {}, currency, dateFilter, targeting);
                  }}
                  className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Analyze with AI
                </button>
              </>
            )}
            {analysisState.step === 'analyzing' && (
              <div className="flex items-center gap-3 py-4">
                <svg className="w-5 h-5 text-accent animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-text-secondary">AI is analyzing your ad set…</p>
              </div>
            )}
            {analysisState.step === 'error' && (
              <>
                <div className="bg-status-red/10 border border-status-red/30 rounded-xl px-4 py-3 my-3">
                  <p className="text-status-red text-sm">{analysisState.error}</p>
                </div>
                <button
                  onClick={() => {
                    const { id, name, status, optimization_goal, billing_event, daily_budget, targeting } = state.data;
                    analyze([{ id, name, status, optimization_goal, billing_event, daily_budget }], aggregateState.status === 'success' ? { [id]: { adset_id: id, ...aggregateState.data } } : {}, currency, dateFilter, targeting);
                  }}
                  className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Retry Analysis
                </button>
              </>
            )}
            {analysisState.step === 'done' && analysisState.analysis && (
              <div className="space-y-4 mt-3">
                <ScoreCard
                  score={analysisState.analysis.overallScore}
                  summary={analysisState.analysis.summary}
                />
                <AngleTabs angles={analysisState.analysis.angles} />
                <button
                  onClick={() => {
                    const { id, name, status, optimization_goal, billing_event, daily_budget, targeting } = state.data;
                    analyze([{ id, name, status, optimization_goal, billing_event, daily_budget }], aggregateState.status === 'success' ? { [id]: { adset_id: id, ...aggregateState.data } } : {}, currency, dateFilter, targeting);
                  }}
                  className="w-full bg-accent/10 hover:bg-accent/20 text-accent font-semibold py-2.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Re-analyze
                </button>
              </div>
            )}
          </div>

          {/* Ads list */}
          <div className="glass-card gradient-border-card rounded-2xl p-5">
            <h2 className="text-base font-semibold text-text-primary mb-4">Ads</h2>

            {(adsState.status === 'idle' || adsState.status === 'loading') && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {adsState.status === 'error' && (
              <p className="text-status-red text-sm">{adsState.error}</p>
            )}

            {adsState.status === 'success' && adsState.data.length === 0 && (
              <EmptyState title="No Ads" />
            )}

            {adsState.status === 'success' && adsState.data.length > 0 && (
              <>
                {/* ── Desktop table ──────────────────────────────────────── */}
                <div className="hidden sm:block overflow-hidden rounded-xl border border-border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        {[['', 'w-[72px]'], ['Ad Creative', ''], ['CTA', 'w-36'], ['Status', 'w-28'], ['Effective', 'w-28']].map(([h, w], i) => (
                          <th key={i} className={`text-left text-xs font-medium text-text-muted uppercase tracking-wide px-4 py-3 ${w}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {adsState.data.map((ad) => {
                        const adStatus = getAdStatus(ad.status);
                        const effectiveStatus = getEffectiveAdStatus(ad.effective_status);
                        const imgSrc = ad.creative?.image_url || ad.creative?.thumbnail_url;
                        const cta = ad.creative?.call_to_action_type;
                        return (
                          <tr key={ad.id} className="hover:bg-white/[0.02] transition-colors align-top">
                            {/* Thumbnail */}
                            <td className="px-4 py-3">
                              {imgSrc ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={imgSrc}
                                  alt={ad.name}
                                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                  </svg>
                                </div>
                              )}
                            </td>

                            {/* Name + title + body */}
                            <td className="px-4 py-3 max-w-xs">
                              <p className="font-semibold text-text-primary text-sm leading-snug line-clamp-1">
                                {ad.creative?.title || ad.name}
                              </p>
                              {ad.creative?.title && (
                                <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{ad.name}</p>
                              )}
                              {ad.creative?.body && (
                                <p className="text-xs text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                                  {ad.creative.body}
                                </p>
                              )}
                            </td>

                            {/* CTA */}
                            <td className="px-4 py-3">
                              {cta && cta !== 'NO_BUTTON' ? (
                                <span className="inline-flex items-center text-xs font-medium bg-accent/10 text-accent px-2 py-1 rounded-lg whitespace-nowrap">
                                  {getCtaLabel(cta)}
                                </span>
                              ) : (
                                <span className="text-text-muted text-xs">—</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              <StatusBadge label={adStatus.label} color={adStatus.color} />
                            </td>

                            {/* Effective */}
                            <td className="px-4 py-3">
                              <StatusBadge label={effectiveStatus.label} color={effectiveStatus.color} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── Mobile cards ───────────────────────────────────────── */}
                <div className="sm:hidden space-y-3">
                  {adsState.data.map((ad) => {
                    const adStatus = getAdStatus(ad.status);
                    const effectiveStatus = getEffectiveAdStatus(ad.effective_status);
                    const imgSrc = ad.creative?.image_url || ad.creative?.thumbnail_url;
                    const cta = ad.creative?.call_to_action_type;
                    return (
                      <div key={ad.id} className="bg-white/[0.02] border border-border/50 rounded-xl overflow-hidden">
                        {/* Creative image */}
                        {imgSrc && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imgSrc}
                            alt={ad.name}
                            className="w-full aspect-video object-cover"
                          />
                        )}

                        <div className="p-3">
                          {/* Title + name */}
                          <p className="font-semibold text-text-primary text-sm leading-snug line-clamp-2">
                            {ad.creative?.title || ad.name}
                          </p>
                          {ad.creative?.title && (
                            <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{ad.name}</p>
                          )}

                          {/* Body text */}
                          {ad.creative?.body && (
                            <p className="text-xs text-text-secondary mt-1.5 line-clamp-3 leading-relaxed">
                              {ad.creative.body}
                            </p>
                          )}

                          {/* Badges row */}
                          <div className="flex items-center gap-2 flex-wrap mt-2.5">
                            <StatusBadge label={adStatus.label} color={adStatus.color} />
                            <StatusBadge label={effectiveStatus.label} color={effectiveStatus.color} />
                            {cta && cta !== 'NO_BUTTON' && (
                              <span className="inline-flex items-center text-xs font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-lg">
                                {getCtaLabel(cta)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-3 text-text-muted text-xs text-right">
                  {adsState.data.length} ad{adsState.data.length !== 1 ? 's' : ''}
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}

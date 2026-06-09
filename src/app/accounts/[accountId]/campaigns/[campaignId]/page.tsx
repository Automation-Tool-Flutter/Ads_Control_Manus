"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useCampaignDetail } from "@/hooks/useCampaignDetail";
import { useAdSets } from "@/hooks/useAdSets";
import { useAccountCurrency } from "@/hooks/useAccountCurrency";
import { useCampaignAnalysis } from "@/hooks/useCampaignAnalysis";
import { useDailyInsights } from "@/hooks/useDailyInsights";
import { CampaignChart } from "@/components/ui/CampaignChart";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { StatusDot } from "@/components/ui/StatusBadge";
import { CopyButton } from "@/components/ui/CopyButton";
import { DetailInfoGrid } from "@/components/ui/DetailInfoGrid";
import { InsightsPanel } from "@/components/ui/InsightsPanel";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScoreCard } from "@/components/optimize/ScoreCard";
import { AngleTabs } from "@/components/optimize/AngleTabs";
import {
  formatCurrency,
  formatSpend,
  formatDate,
  getCampaignStatus,
  getObjectiveLabel,
  getAdSetStatus,
  getOptGoalLabel,
} from "@/lib/utils";
import type { DatePreset, DateRange } from "@/lib/types";

export default function CampaignDetailPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const params = useParams<{ accountId: string; campaignId: string }>();
  const { accountId, campaignId } = params;
  const searchParams = useSearchParams();
  const accountName = searchParams.get('accountName') ?? accountId;


  useEffect(() => {
    if (!auth.isLoading && !auth.token) {
      router.replace("/login");
    }
  }, [auth.isLoading, auth.token, router]);

  const { state, retry } = useCampaignDetail(campaignId, auth.token);
  const { state: adsetsState, insights: adsetInsights } = useAdSets(campaignId, auth.token);
  const currency = useAccountCurrency(accountId, auth.token);

  const {
    state: analysisState,
    analyze,
    reset: resetAnalysis,
  } = useCampaignAnalysis(accountId);
  const [dateFilter, setDateFilter] = useState<DatePreset | DateRange>("last_30d");
  const { state: chartState, aggregateState } = useDailyInsights(campaignId, dateFilter, 'campaign', auth.token);

  // Reset analysis when date filter changes
  useEffect(() => {
    if (analysisState.step === "done") resetAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  if (auth.isLoading || state.status === "idle") return null;

  return (
    <PageContainer>
      <div className="mb-6">
        <Breadcrumb
          items={[
            { label: 'Accounts', href: '/accounts' },
            { label: accountName, href: `/accounts/${accountId}` },
            { label: 'Campaigns', href: `/accounts/${accountId}/campaigns` },
            { label: searchParams.get('campaignName') ?? (state.status === 'success' ? state.data.name : campaignId) },
          ]}
        />
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary mt-3">
          Campaign Details
        </h1>
      </div>

      {state.status === "loading" && (
        <LoadingState message="Loading campaign info..." />
      )}

      {state.status === "error" && (
        <ErrorState message={state.error} onRetry={retry} />
      )}

      {state.status === "success" && (
        <div className="space-y-6">
          {/* Info card */}
          <div className="glass-card gradient-border-card rounded-2xl p-5">
            <div className="flex items-start gap-4 mb-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <StatusDot color={getCampaignStatus(state.data.status).color} />
                  <h2 className="text-lg font-bold text-text-primary truncate">
                    {state.data.name}
                  </h2>
                </div>
                <code className="font-mono text-xs text-text-muted">
                  {state.data.id}
                </code>
              </div>
            </div>

            <DetailInfoGrid
              items={[
                {
                  label: "Objective",
                  value: getObjectiveLabel(state.data.objective),
                },
                {
                  label: "Daily Budget",
                  value: state.data.daily_budget
                    ? formatCurrency(state.data.daily_budget, currency)
                    : "—",
                },
                {
                  label: "Lifetime Budget",
                  value: state.data.lifetime_budget
                    ? formatCurrency(state.data.lifetime_budget, currency)
                    : "—",
                },
                {
                  label: "Budget Remaining",
                  value: state.data.budget_remaining
                    ? formatCurrency(state.data.budget_remaining, currency)
                    : "—",
                },
                {
                  label: "Start Date",
                  value: formatDate(state.data.start_time),
                },
                { label: "End Date", value: formatDate(state.data.stop_time) },
                {
                  label: "Created",
                  value: formatDate(state.data.created_time),
                },
              ]}
            />
          </div>

          {/* Insights */}
          <div className="glass-card gradient-border-card rounded-2xl p-4">
            <InsightsPanel
              objectId={campaignId}
              level="campaign"
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
                  Get AI-powered analysis of your campaign — performance trends, budget efficiency, and optimization recommendations.
                </p>
                <button
                  onClick={() => {
                    const { id, name, status, objective, daily_budget, lifetime_budget } = state.data;
                    analyze([{ id, name, status, objective, daily_budget, lifetime_budget }], aggregateState.status === 'success' ? { [id]: { campaign_id: id, ...aggregateState.data } } : {}, currency, dateFilter, auth.token);
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
            {analysisState.step === "analyzing" && (
              <div className="flex items-center gap-3 py-4">
                <svg className="w-5 h-5 text-accent animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-text-secondary">AI is analyzing your campaign…</p>
              </div>
            )}
            {analysisState.step === "error" && (
              <>
                <div className="bg-status-red/10 border border-status-red/30 rounded-xl px-4 py-3 my-3">
                  <p className="text-status-red text-sm">{analysisState.error}</p>
                </div>
                <button
                  onClick={() => {
                    const { id, name, status, objective, daily_budget, lifetime_budget } = state.data;
                    analyze([{ id, name, status, objective, daily_budget, lifetime_budget }], aggregateState.status === 'success' ? { [id]: { campaign_id: id, ...aggregateState.data } } : {}, currency, dateFilter, auth.token);
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
            {analysisState.step === "done" && analysisState.analysis && (
              <div className="space-y-4 mt-3">
                <ScoreCard
                  score={analysisState.analysis.overallScore}
                  summary={analysisState.analysis.summary}
                />
                <AngleTabs angles={analysisState.analysis.angles} />
                <button
                  onClick={() => {
                    const { id, name, status, objective, daily_budget, lifetime_budget } = state.data;
                    analyze([{ id, name, status, objective, daily_budget, lifetime_budget }], aggregateState.status === 'success' ? { [id]: { campaign_id: id, ...aggregateState.data } } : {}, currency, dateFilter, auth.token);
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

          {/* Ad Sets inline */}
          <div className="glass-card gradient-border-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-text-primary">
                Ad Sets
              </h2>
              <Link
                href={`/accounts/${accountId}/campaigns/${campaignId}/adsets`}
                className="text-accent text-sm hover:underline"
              >
                View All
              </Link>
            </div>

            {(adsetsState.status === "idle" ||
              adsetsState.status === "loading") && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 bg-white/5 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            )}

            {adsetsState.status === "error" && (
              <p className="text-status-red text-sm">{adsetsState.error}</p>
            )}

            {adsetsState.status === "success" &&
              adsetsState.data.length === 0 && (
                <EmptyState title="No Ad Sets" />
              )}

            {adsetsState.status === "success" &&
              adsetsState.data.length > 0 && (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-hidden rounded-xl border border-border">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          {[
                            "Ad Set",
                            "Opt. Goal",
                            "Daily Budget",
                            "Spend",
                            "",
                          ].map((h, i) => (
                            <th
                              key={i}
                              className={`text-left text-xs font-medium text-text-muted uppercase tracking-wide px-4 py-3 ${i === 4 ? "w-8" : ""}`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {adsetsState.data.map((adset) => {
                          const status = getAdSetStatus(adset.status);
                          return (
                            <tr
                              key={adset.id}
                              className="hover:bg-white/[0.02] transition-colors group"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <StatusDot color={status.color} />
                                  <Link
                                    href={`/accounts/${accountId}/campaigns/${campaignId}/adsets/${adset.id}`}
                                    className="font-medium text-text-primary hover:text-accent transition-colors truncate max-w-[200px]"
                                  >
                                    {adset.name}
                                  </Link>
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <code className="font-mono text-xs text-text-muted">
                                    {adset.id}
                                  </code>
                                  <CopyButton value={adset.id} />
                                </div>
                              </td>
                              <td className="px-4 py-3 text-text-secondary text-sm">
                                {adset.optimization_goal
                                  ? getOptGoalLabel(adset.optimization_goal)
                                  : "—"}
                              </td>
                              <td className="px-4 py-3 text-text-primary text-sm">
                                {adset.daily_budget
                                  ? formatCurrency(adset.daily_budget, currency)
                                  : "—"}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-text-primary tabular-nums">
                                {formatSpend(adsetInsights[adset.id]?.spend, currency)}
                              </td>
                              <td className="px-3 py-3">
                                <Link
                                  href={`/accounts/${accountId}/campaigns/${campaignId}/adsets/${adset.id}`}
                                  className="text-text-muted hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                                    />
                                  </svg>
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="sm:hidden space-y-2">
                    {adsetsState.data.map((adset) => {
                      const status = getAdSetStatus(adset.status);
                      return (
                        <Link
                          key={adset.id}
                          href={`/accounts/${accountId}/campaigns/${campaignId}/adsets/${adset.id}`}
                          className="flex items-center justify-between bg-white/[0.02] border border-border/50 rounded-xl px-4 py-3 active:bg-white/5 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <StatusDot color={status.color} />
                              <p className="font-medium text-text-primary truncate">
                                {adset.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {adset.daily_budget && (
                                <span className="text-text-muted text-xs">
                                  {formatCurrency(adset.daily_budget, currency)}/day
                                </span>
                              )}
                              {adsetInsights[adset.id]?.spend && (
                                <>
                                  <span className="text-border/60 text-xs">·</span>
                                  <span className="text-text-secondary text-xs font-medium">
                                    {formatSpend(adsetInsights[adset.id].spend, currency)} spent
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <svg
                            className="w-4 h-4 text-text-muted flex-shrink-0 ml-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8.25 4.5l7.5 7.5-7.5 7.5"
                            />
                          </svg>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}

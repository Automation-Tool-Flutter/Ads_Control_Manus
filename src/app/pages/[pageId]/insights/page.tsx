"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePageInsights } from "@/hooks/usePageInsights";
import { usePageToken } from "@/hooks/usePageToken";
import { PageContainer } from "@/components/layout/PageContainer";
import { ControlHeader } from "@/components/layout/ControlHeader";
import { ErrorState } from "@/components/ui/ErrorState";
import { DateFilter } from "@/components/ui/DateFilter";
import { InsightChart } from "@/components/pages/InsightChart";
import { InsightAICard } from "@/components/pages/InsightAICard";
import { usePageInsightAnalysis } from "@/hooks/usePageInsightAnalysis";
import type { PageInsightMetric, DatePreset, DateRange } from "@/lib/types";

// Ordered summary cards — mirrors Meta Business Suite's "Overview" layout
// aggregate: 'sum' for daily metrics (period total), 'latest' for cumulative metrics
const SUMMARY_CARDS: { name: string; label: string; aggregate: 'sum' | 'latest' }[] = [
  { name: "page_follows", label: "Total Followers", aggregate: "latest" },
  { name: "page_views_total", label: "Page Views", aggregate: "sum" },
  { name: "page_post_engagements", label: "Post Engagements", aggregate: "sum" },
  { name: "post_clicks", label: "Post Clicks", aggregate: "sum" },
  { name: "page_video_complete_views_30s", label: "Video 30s Completions", aggregate: "sum" },
];

function getPeriodSum(metric: PageInsightMetric): number {
  if (!metric.values || metric.values.length === 0) return 0;
  return metric.values.reduce((sum, v) => sum + (typeof v.value === "number" ? v.value : 0), 0);
}

function getLatestValue(metric: PageInsightMetric): number {
  if (!metric.values || metric.values.length === 0) return 0;
  const last = metric.values[metric.values.length - 1];
  return typeof last.value === "number" ? last.value : 0;
}

function computeNetNewFollowers(metrics: PageInsightMetric[]): number {
  const follows = metrics.find((m) => m.name === "page_daily_follows");
  const unfollows = metrics.find((m) => m.name === "page_daily_unfollows_unique");
  return (follows ? getPeriodSum(follows) : 0) - (unfollows ? getPeriodSum(unfollows) : 0);
}

function MetricCard({
  metric,
  label,
  aggregate,
}: {
  metric: PageInsightMetric;
  label: string;
  aggregate: 'sum' | 'latest';
}) {
  const value = aggregate === "sum" ? getPeriodSum(metric) : getLatestValue(metric);

  return (
    <div className="glass-card gradient-border-card rounded-2xl p-4">
      <p className="text-xs text-text-muted uppercase tracking-wide mb-2">
        {label}
      </p>
      <p className="text-2xl font-bold text-text-primary">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

export default function PageInsightsPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const params = useParams<{ pageId: string }>();
  const { pageId } = params;

  const [filter, setFilter] = useState<DatePreset | DateRange>("last_30d");

  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.replace("/login");
  }, [auth.isLoading, auth.token, router]);

  const pageToken = usePageToken(pageId, auth.token);

  const { state, retry } = usePageInsights(pageId, pageToken, filter);
  const {
    state: aiState,
    analyze,
    reset: resetAnalysis,
  } = usePageInsightAnalysis(pageId);

  if (auth.isLoading) return null;

  const metrics = state.status === "success" ? state.data.data : [];

  return (
    <PageContainer>
      <ControlHeader
        breadcrumbs={[
            { label: "Pages", href: "/pages" },
            { label: pageId, href: `/pages/${pageId}` },
            { label: "Insights" },
        ]}
        eyebrow="Meta Page analytics"
        title="Page Insights"
        description="Review Page growth, engagement, reach, video, monetization signals, and GPT recommendations in one workspace."
        badge="Insights + GPT"
        stats={metrics.length > 0 ? [
          { label: 'net followers', value: computeNetNewFollowers(metrics).toLocaleString(), tone: computeNetNewFollowers(metrics) >= 0 ? 'green' : 'amber' },
          { label: 'metrics', value: metrics.length, tone: 'neutral' },
        ] : []}
      >
        {/* Date filter */}
        <div className="w-full sm:w-72">
            <DateFilter
              value={filter}
              onChange={setFilter}
              disabled={state.status === "loading"}
            />
        </div>
      </ControlHeader>

      {state.status === "loading" && (
        <>
          <InsightChart title="" metrics={[]} lines={[]} loading />
          <InsightChart title="" metrics={[]} lines={[]} loading />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="glass-card rounded-2xl p-4 animate-pulse"
              >
                <div className="h-3 bg-white/5 rounded w-3/4 mb-3" />
                <div className="h-7 bg-white/8 rounded w-1/2" />
              </div>
            ))}
          </div>
        </>
      )}

      {state.status === "error" &&
        // Error code 100 = invalid metric = New Page Experience, insights API not supported
        (state.error.includes("#100") ||
        state.error.toLowerCase().includes("valid insights metric") ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-accent"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-text-primary mb-1">
                Insights unavailable
              </p>
              <p className="text-text-secondary text-sm max-w-sm">
                This page uses <strong>New Page Experience</strong> — Facebook
                has moved Insights to Meta Business Suite and no longer supports
                the legacy Insights API for this page type.
              </p>
            </div>
            <a
              href={`https://www.facebook.com/${pageId}/insights`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors"
            >
              View Insights on Facebook →
            </a>
          </div>
        ) : (
          <ErrorState message={state.error} onRetry={retry} />
        ))}

      {state.status === "success" && metrics.length === 0 && (
        <p className="text-text-secondary text-sm text-center py-12">
          No insights data available for this period.
        </p>
      )}

      {state.status === "success" && metrics.length > 0 && (
        <>
          {/* Summary — Card Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {/* Net New Followers: sum of daily follows minus unfollows */}
            <div className="glass-card gradient-border-card rounded-2xl p-4">
              <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Net New Followers</p>
              <p className={`text-2xl font-bold ${computeNetNewFollowers(metrics) >= 0 ? 'text-text-primary' : 'text-status-red'}`}>
                {computeNetNewFollowers(metrics) >= 0 ? '+' : ''}{computeNetNewFollowers(metrics).toLocaleString()}
              </p>
            </div>
            {SUMMARY_CARDS.filter(c => c.name !== "page_follows").flatMap(({ name, label, aggregate }) => {
              const metric = metrics.find((m) => m.name === name);
              if (!metric) return [];
              return [<MetricCard key={name} metric={metric} label={label} aggregate={aggregate} />];
            })}
          </div>

          {/* Chart Section 1: Followers & Growth */}
          <InsightChart
            title="Followers & Growth"
            metrics={metrics}
            lines={[
              {
                metricName: "page_daily_follows",
                label: "Follows",
                color: "#4ade80",
              },
              {
                metricName: "page_daily_unfollows_unique",
                label: "Unfollows",
                color: "#f87171",
              },
            ]}
          />

          {/* Chart Section 2: Engagement & Reach */}
          <InsightChart
            title="Engagement & Reach"
            metrics={metrics}
            lines={[
              {
                metricName: "page_post_engagements",
                label: "Post Engagements",
                color: "#60a5fa",
              },
              {
                metricName: "page_views_total",
                label: "Page Views",
                color: "#f59e0b",
              },
            ]}
          />

          {/* Chart Section 3: Video Views — hidden if no video data */}
          {metrics.some(
            (m) =>
              m.name === "page_video_views" &&
              m.values.some((v) => v.value > 0),
          ) && (
            <InsightChart
              title="Video Views"
              metrics={metrics}
              lines={[
                {
                  metricName: "page_video_views_organic",
                  label: "Organic",
                  color: "#a78bfa",
                  type: "area",
                  stacked: true,
                },
                {
                  metricName: "page_video_views_paid",
                  label: "Paid",
                  color: "#fb923c",
                  type: "area",
                  stacked: true,
                },
              ]}
            />
          )}

          {/* Chart Section 4: Monetization — hidden if no earnings */}
          {metrics.some(
            (m) =>
              m.name === "post_video_ad_break_earnings" &&
              m.values.some((v) => v.value > 0),
          ) && (
            <InsightChart
              title="Monetization"
              metrics={metrics}
              lines={[
                {
                  metricName: "post_video_ad_break_earnings",
                  label: "Ad Break Revenue",
                  color: "#34d399",
                },
                {
                  metricName: "post_video_ad_break_ad_impressions",
                  label: "Ad Impressions",
                  color: "#e879f9",
                },
              ]}
            />
          )}
          {/* AI Analysis Card */}
          <InsightAICard
            metrics={metrics}
            filter={filter}
            state={aiState}
            onAnalyze={() => analyze(metrics, filter)}
            onReset={resetAnalysis}
          />
        </>
      )}
    </PageContainer>
  );
}

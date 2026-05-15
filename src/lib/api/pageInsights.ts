import { graphFetch } from "./client";
import type { PageInsightData } from "../types";

// Core growth & engagement metrics (always fetched)
const CORE_METRICS = [
  "page_follows", // Total followers — cumulative KPI
  "page_daily_follows", // Daily new follows — chart series
  "page_daily_unfollows_unique", // Daily unfollows — chart series
  "page_post_engagements", // Post engagements — chart + card
  "page_views_total", // Page views — chart + card
  "post_clicks", // Post clicks — card
];

// Video metrics (fetched always; charts/cards shown conditionally if data > 0)
const VIDEO_METRICS = [
  "page_video_views", // Total video views — condition trigger
  "page_video_views_organic", // Organic — stacked area chart
  "page_video_views_paid", // Paid — stacked area chart
  "page_video_complete_views_30s", // 30s completions — card
];

// Monetization metrics (fetched always; shown conditionally if earnings > 0)
const MONETIZATION_METRICS = [
  "post_video_ad_break_earnings", // Ad break revenue — chart + card
  "post_video_ad_break_ad_impressions", // Ad impressions — chart
];

const METRICS = [
  ...CORE_METRICS,
  ...VIDEO_METRICS,
  ...MONETIZATION_METRICS,
].join(",");

export async function getPageInsights(
  pageId: string,
  token: string,
  since?: string,
  until?: string,
): Promise<PageInsightData> {
  const params: Record<string, string> = {
    metric: METRICS,
    period: "day",
  };
  if (since) params.since = since;
  if (until) params.until = until;

  return graphFetch<PageInsightData>(`/${pageId}/insights`, params, token);
}

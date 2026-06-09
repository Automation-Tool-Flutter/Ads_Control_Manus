import { graphFetch } from './client';

interface InsightValue {
  value: number;
  end_time?: string;
}

interface InsightMetric {
  name: string;
  period: string;
  values: InsightValue[];
}

interface PostInsightsResponse {
  data: InsightMetric[];
}

export interface PostInsights {
  views?: number;          // post_media_view — replacement for deprecated post_impressions
  clicks?: number;         // post_clicks — tổng lượt click vào bài
}

const SUPPORTED_POST_INSIGHT_METRICS = [
  'post_media_view',
  'post_clicks',
] as const;

type SupportedPostInsightMetric = (typeof SUPPORTED_POST_INSIGHT_METRICS)[number];

async function getSinglePostInsight(
  postId: string,
  metric: SupportedPostInsightMetric,
  token: string,
): Promise<InsightMetric | null> {
  try {
    const result = await graphFetch<PostInsightsResponse>(
      `/${postId}/insights`,
      {
        metric,
        period: 'lifetime',
      },
      token,
    );

    return result.data?.find(m => m.name === metric) ?? null;
  } catch {
    // Meta regularly deprecates post insight metrics. Keep post analysis usable
    // when a single metric becomes invalid for the current Graph API version.
    return null;
  }
}

export async function getPostInsights(postId: string, token: string): Promise<PostInsights> {
  const metrics = await Promise.all(
    SUPPORTED_POST_INSIGHT_METRICS.map(metric => getSinglePostInsight(postId, metric, token)),
  );

  const getVal = (name: SupportedPostInsightMetric): number | undefined => {
    const metric = metrics.find(m => m?.name === name);
    const val = metric?.values?.[0]?.value;
    return typeof val === 'number' ? val : undefined;
  };

  return {
    views: getVal('post_media_view'),
    clicks: getVal('post_clicks'),
  };
}

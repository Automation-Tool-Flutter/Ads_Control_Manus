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
  impressions?: number;    // post_impressions — tổng views (organic + paid)
  reach?: number;          // post_impressions_unique — số người thấy bài (unique)
  engagedUsers?: number;   // post_engaged_users — số người đã click/tương tác
  clicks?: number;         // post_clicks — tổng lượt click vào bài
}

export async function getPostInsights(postId: string, token: string): Promise<PostInsights> {
  try {
    const result = await graphFetch<PostInsightsResponse>(
      `/${postId}/insights`,
      {
        metric: 'post_impressions,post_impressions_unique,post_engaged_users,post_clicks',
        period: 'lifetime',
      },
      token,
    );

    const getVal = (name: string): number | undefined => {
      const metric = result.data?.find(m => m.name === name);
      const val = metric?.values?.[0]?.value;
      return typeof val === 'number' ? val : undefined;
    };

    return {
      impressions: getVal('post_impressions'),
      reach: getVal('post_impressions_unique'),
      engagedUsers: getVal('post_engaged_users'),
      clicks: getVal('post_clicks'),
    };
  } catch {
    // Insights not available for all post types — fallback gracefully
    return {};
  }
}

import { NextRequest, NextResponse } from 'next/server';
import type { PageInsightMetric } from '@/lib/types';
import type { GeminiAnalysis } from '@/lib/types/optimize';
import { callGemini, GeminiError } from '@/lib/gemini';

const SYSTEM_PROMPT = `You are a senior Facebook Page strategist and organic growth analyst. \
You specialize in interpreting Meta Page Insights data to identify growth bottlenecks, engagement patterns, \
and content opportunities. Your analysis must be data-driven, cite exact numbers, and provide \
immediately actionable recommendations with expected outcomes. Return valid JSON only. All content in English.`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricStats {
  label: string;
  total: number;
  dailyAvg: number;
  latest: number;
  peak: number;
  peakDate: string;
  daysWithActivity: number;
  trend: 'up' | 'down' | 'flat';
  trendPercent: number;       // % change first-half vs second-half
  last7: number[];            // last 7 daily values for time-series context
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const LABELS: Record<string, string> = {
  page_follows:                       'Total Followers (cumulative)',
  page_daily_follows:                 'Daily New Follows',
  page_daily_unfollows_unique:        'Daily Unfollows',
  page_post_engagements:              'Post Engagements',
  page_views_total:                   'Page Views',
  post_clicks:                        'Post Clicks',
  page_video_views:                   'Total Video Views',
  page_video_views_organic:           'Organic Video Views',
  page_video_views_paid:              'Paid Video Views',
  page_video_complete_views_30s:      'Video 30s Completions',
  post_video_ad_break_earnings:       'Ad Break Revenue (USD×100)',
  post_video_ad_break_ad_impressions: 'Ad Break Impressions',
};

// ─── Summarize a single metric ────────────────────────────────────────────────

function summarizeMetric(metric: PageInsightMetric): MetricStats {
  const data = metric.values
    .filter(v => typeof v.value === 'number')
    .map(v => ({ value: v.value as number, date: v.end_time }));

  const values = data.map(d => d.value);
  const total = values.reduce((s, n) => s + n, 0);
  const latest = values[values.length - 1] ?? 0;
  const dailyAvg = data.length > 0 ? Math.round(total / data.length) : 0;
  const daysWithActivity = values.filter(v => v > 0).length;

  const peakIdx = values.indexOf(Math.max(...values));
  const peak = values[peakIdx] ?? 0;
  const peakDate = data[peakIdx]?.date
    ? new Date(data[peakIdx].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—';

  // Trend: compare first-half average vs second-half average (more stable than first vs last point)
  let trend: 'up' | 'down' | 'flat' = 'flat';
  let trendPercent = 0;
  if (values.length >= 4) {
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);
    const firstAvg = firstHalf.reduce((s, n) => s + n, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, n) => s + n, 0) / secondHalf.length;
    if (firstAvg > 0) {
      trendPercent = Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
      trend = trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'flat';
    }
  }

  const last7 = values.slice(-7).map(Math.round);

  return {
    label: LABELS[metric.name] ?? metric.name,
    total,
    dailyAvg,
    latest,
    peak,
    peakDate,
    daysWithActivity,
    trend,
    trendPercent,
    last7,
  };
}

// ─── Derived KPIs ─────────────────────────────────────────────────────────────

interface DerivedKPIs {
  netNewFollowers: number;
  churnRate: string;          // unfollows / follows %
  followMomentum: 'positive' | 'negative' | 'neutral';
  engagementPerFollower: string | null;  // engagements / followers %
  clickThroughRate: string | null;       // clicks / engagements %
  video30sCompletionRate: string | null; // 30s views / total views %
  monetizationRPM: string | null;        // revenue / impressions × 1000
  hasVideoData: boolean;
  hasMonetizationData: boolean;
}

function computeDerivedKPIs(
  stats: Record<string, MetricStats>,
): DerivedKPIs {
  const follows   = stats['page_daily_follows']?.total ?? 0;
  const unfollows = stats['page_daily_unfollows_unique']?.total ?? 0;
  const followers = stats['page_follows']?.latest ?? 0;
  const engagements = stats['page_post_engagements']?.total ?? 0;
  const clicks    = stats['post_clicks']?.total ?? 0;
  const video30s  = stats['page_video_complete_views_30s']?.total ?? 0;
  const videoTotal= stats['page_video_views']?.total ?? 0;
  const earnings  = stats['post_video_ad_break_earnings']?.total ?? 0;
  const adImpr    = stats['post_video_ad_break_ad_impressions']?.total ?? 0;

  const netNewFollowers = follows - unfollows;
  const churnRate = follows > 0
    ? `${((unfollows / follows) * 100).toFixed(1)}%`
    : '—';
  const followMomentum: DerivedKPIs['followMomentum'] =
    netNewFollowers > 0 ? 'positive' : netNewFollowers < 0 ? 'negative' : 'neutral';

  const engagementPerFollower = followers > 0 && engagements > 0
    ? `${((engagements / followers) * 100).toFixed(2)}%`
    : null;

  const clickThroughRate = engagements > 0 && clicks > 0
    ? `${((clicks / engagements) * 100).toFixed(1)}%`
    : null;

  const video30sCompletionRate = videoTotal > 0 && video30s > 0
    ? `${((video30s / videoTotal) * 100).toFixed(1)}%`
    : null;

  // earnings are in USD×100 (Meta returns cents)
  const monetizationRPM = adImpr > 0 && earnings > 0
    ? `$${((earnings / 100 / adImpr) * 1000).toFixed(2)}`
    : null;

  return {
    netNewFollowers,
    churnRate,
    followMomentum,
    engagementPerFollower,
    clickThroughRate,
    video30sCompletionRate,
    monetizationRPM,
    hasVideoData: videoTotal > 0,
    hasMonetizationData: earnings > 0,
  };
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function fmtStat(s: MetricStats): string {
  const trendTag = s.trend === 'up' ? `↑${s.trendPercent}%` : s.trend === 'down' ? `↓${Math.abs(s.trendPercent)}%` : '→flat';
  return `  ${s.label}:
    Period total: ${s.total.toLocaleString()} | Daily avg: ${s.dailyAvg.toLocaleString()} | Peak: ${s.peak.toLocaleString()} on ${s.peakDate}
    Trend: ${trendTag} | Active days: ${s.daysWithActivity} | Last 7 days: [${s.last7.join(', ')}]`;
}

function buildPrompt(
  stats: Record<string, MetricStats>,
  kpis: DerivedKPIs,
  dateRange: string,
): string {
  const coreBlock = [
    stats['page_follows'],
    stats['page_daily_follows'],
    stats['page_daily_unfollows_unique'],
    stats['page_post_engagements'],
    stats['page_views_total'],
    stats['post_clicks'],
  ].filter(Boolean).map(s => fmtStat(s!)).join('\n');

  const videoBlock = kpis.hasVideoData ? [
    stats['page_video_views'],
    stats['page_video_views_organic'],
    stats['page_video_views_paid'],
    stats['page_video_complete_views_30s'],
  ].filter(Boolean).map(s => fmtStat(s!)).join('\n') : null;

  const monetizationBlock = kpis.hasMonetizationData ? [
    stats['post_video_ad_break_earnings'],
    stats['post_video_ad_break_ad_impressions'],
  ].filter(Boolean).map(s => fmtStat(s!)).join('\n') : null;

  const kpiBlock = `
DERIVED KPIs (computed from raw data):
  Net new followers this period: ${kpis.netNewFollowers >= 0 ? '+' : ''}${kpis.netNewFollowers.toLocaleString()} (${kpis.followMomentum} growth)
  Follower churn rate: ${kpis.churnRate} (unfollows ÷ new follows — healthy: < 30%)
  Engagement per follower: ${kpis.engagementPerFollower ?? '—'} (good organic: > 1%)
  Post click-through rate: ${kpis.clickThroughRate ?? '—'} (clicks ÷ engagements)
  ${kpis.hasVideoData ? `Video 30s completion rate: ${kpis.video30sCompletionRate ?? '—'} (good: > 25%)` : ''}
  ${kpis.hasMonetizationData ? `Ad break RPM: ${kpis.monetizationRPM ?? '—'}` : ''}`;

  const angles = [
    'Growth & Retention',
    'Engagement Quality',
    'Content & Reach',
    'Optimization Opportunities',
  ];

  if (kpis.hasVideoData) angles[2] = 'Content, Reach & Video';
  if (kpis.hasMonetizationData) angles[3] = 'Monetization & Opportunities';

  return `Analyze the following Facebook Page Insights data for period: ${dateRange}.

━━━ CORE METRICS ━━━
${coreBlock}
${videoBlock ? `\n━━━ VIDEO METRICS ━━━\n${videoBlock}` : ''}
${monetizationBlock ? `\n━━━ MONETIZATION METRICS ━━━\n${monetizationBlock}` : ''}
${kpiBlock}

━━━ ANALYSIS RULES ━━━
- Churn rate > 50%: critical audience mismatch or content problem
- Churn rate 30-50%: moderate retention issue
- Churn rate < 30%: healthy retention
- Engagement per follower < 0.5%: content not resonating or audience is cold
- Engagement per follower 1-3%: healthy organic performance
- Engagement per follower > 3%: excellent content resonance
- If trend is "down" for engagements AND unfollows rising: urgent content pivot needed
- Peak day analysis: if all engagement concentrates on 1-2 days, posting consistency is low
- Video 30s completion < 15%: video content needs improvement (hook, length, quality)
- Video 30s completion > 40%: strong video content → double down on video
- If page_views >> page_post_engagements: visitors browse but don't engage → profile/CTA issue
- If post_clicks / engagements < 5%: posts have low action intent → weak CTAs
- Daily avg = 0 for several metrics: page may be in low-activity period

Return a JSON object with EXACT schema (no extra fields):
{
  "summary": "4-5 sentences covering: overall page health verdict, strongest metric with number, biggest concern with number, growth momentum (net followers), and one priority action",
  "overallScore": <0-100>,
  "angles": [
    {
      "name": "${angles[0]}",
      "level": "account",
      "score": <0-100>,
      "strengths": [
        "specific strength citing exact numbers and dates"
      ],
      "issues": [
        "specific issue citing exact numbers and what it signals"
      ],
      "recommendations": [
        {
          "title": "Short action title",
          "description": "Concrete, step-by-step action with expected outcome and timeframe",
          "priority": "high|medium|low",
          "metric": "follows|unfollows|net_followers|churn_rate"
        }
      ]
    },
    {
      "name": "${angles[1]}",
      "level": "campaign",
      "score": <0-100>,
      "strengths": ["strength with numbers"],
      "issues": ["issue with numbers and business impact"],
      "recommendations": [
        {
          "title": "Short action",
          "description": "Specific improvement with expected engagement lift",
          "priority": "high|medium|low",
          "metric": "engagements|clicks|ctr"
        }
      ]
    },
    {
      "name": "${angles[2]}",
      "level": "adset",
      "score": <0-100>,
      "strengths": ["strength"],
      "issues": ["issue"],
      "recommendations": [
        {
          "title": "Short action",
          "description": "Content format or posting strategy change with rationale",
          "priority": "high|medium|low",
          "metric": "page_views|video_views|video_completion|reach"
        }
      ]
    },
    {
      "name": "${angles[3]}",
      "level": "ad",
      "score": <0-100>,
      "strengths": ["strength"],
      "issues": ["issue"],
      "recommendations": [
        {
          "title": "Short action",
          "description": "Tactical opportunity with specific next step",
          "priority": "high|medium|low",
          "metric": "rpm|ctr|engagements|follows"
        }
      ]
    }
  ]
}

SCORING: 80-100 Excellent, 60-79 Good, 40-59 Needs Improvement, 0-39 Poor.
Each angle: at least 2 strengths OR issues (whichever are relevant), 1-3 specific recommendations.
If data is zero or unavailable for a metric, acknowledge it and skip benchmarking for that metric.
Return ONLY JSON, no markdown, no extra text.`;
}


// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { metrics: PageInsightMetric[]; dateRange: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const stats: Record<string, MetricStats> = {};
  for (const metric of body.metrics) {
    if (LABELS[metric.name]) {
      stats[metric.name] = summarizeMetric(metric);
    }
  }

  const hasData = Object.values(stats).some(s => s.total > 0 || s.label.includes('Follower'));
  if (!hasData) {
    return NextResponse.json({ error: 'No metrics data available to analyze.' }, { status: 422 });
  }

  const kpis = computeDerivedKPIs(stats);

  try {
    const analysis = await callGemini<GeminiAnalysis>(
      SYSTEM_PROMPT,
      buildPrompt(stats, kpis, body.dateRange),
      { temperature: 0.25, maxOutputTokens: 4096 },
    );
    return NextResponse.json(analysis);
  } catch (err) {
    if (err instanceof GeminiError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Analysis failed.' }, { status: 500 });
  }
}

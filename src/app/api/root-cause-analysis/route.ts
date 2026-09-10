import { NextRequest, NextResponse } from 'next/server';
import { callOpenAI, OpenAIError } from '@/lib/openai';
import { deriveCampaignKpis } from '@/lib/campaign-kpis';
import type { InsightActionValue, InsightsData } from '@/lib/types';
import type { RootCauseAnalysis, RootCausePayload } from '@/lib/types/root-cause';

const SYSTEM_PROMPT = `You are a Meta Ads diagnostic analyst. Build a causal explanation from supplied period-over-period metrics. Distinguish measured drivers from hypotheses. Never present audience, creative, landing-page, auction, or tracking explanations as confirmed unless the supplied data proves them. Every hypothesis must include a concrete next check. Use exact entity IDs and return English content.`;

const LEAF_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    label: { type: 'string' },
    evidence: { type: 'string' },
    confidence: { type: 'integer', minimum: 0, maximum: 100 },
    nextCheck: { type: 'string' },
    entityType: { type: 'string', enum: ['campaign', 'adset', 'ad', 'none'] },
    entityId: { type: 'string' },
  },
  required: ['id', 'label', 'evidence', 'confidence', 'nextCheck', 'entityType', 'entityId'],
};

const ROOT_CAUSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    headline: { type: 'string' },
    summary: { type: 'string' },
    severity: { type: 'string', enum: ['critical', 'warning', 'opportunity', 'stable'] },
    confidence: { type: 'integer', minimum: 0, maximum: 100 },
    comparisonLabel: { type: 'string' },
    primaryMetric: {
      type: 'object',
      additionalProperties: false,
      properties: {
        label: { type: 'string' },
        currentValue: { type: 'string' },
        previousValue: { type: 'string' },
        changePercent: { type: 'number' },
      },
      required: ['label', 'currentValue', 'previousValue', 'changePercent'],
    },
    drivers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          metric: { type: 'string' },
          currentValue: { type: 'string' },
          previousValue: { type: 'string' },
          changePercent: { type: 'number' },
          evidence: { type: 'string' },
          confidence: { type: 'integer', minimum: 0, maximum: 100 },
          nextCheck: { type: 'string' },
          entityType: { type: 'string', enum: ['campaign', 'adset', 'ad', 'none'] },
          entityId: { type: 'string' },
          causes: { type: 'array', items: LEAF_SCHEMA },
        },
        required: ['id', 'label', 'metric', 'currentValue', 'previousValue', 'changePercent', 'evidence', 'confidence', 'nextCheck', 'entityType', 'entityId', 'causes'],
      },
    },
  },
  required: ['headline', 'summary', 'severity', 'confidence', 'comparisonLabel', 'primaryMetric', 'drivers'],
};

function sumActionStats(rows: InsightsData[], field: keyof InsightsData): InsightActionValue[] | undefined {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const stats = row[field] as InsightActionValue[] | undefined;
    for (const stat of stats ?? []) {
      totals.set(stat.action_type, (totals.get(stat.action_type) ?? 0) + Number(stat.value || 0));
    }
  }
  return totals.size
    ? Array.from(totals.entries()).map(([action_type, value]) => ({ action_type, value: String(value) }))
    : undefined;
}

function aggregate(rows: InsightsData[]): InsightsData {
  const sum = (field: keyof InsightsData) => rows.reduce((total, row) => total + Number(row[field] || 0), 0);
  const impressions = sum('impressions');
  const clicks = sum('clicks');
  const spend = sum('spend');
  return {
    impressions: String(impressions),
    clicks: String(clicks),
    spend: String(spend),
    ctr: impressions > 0 ? String((clicks / impressions) * 100) : undefined,
    cpc: clicks > 0 ? String(spend / clicks) : undefined,
    cpm: impressions > 0 ? String((spend / impressions) * 1000) : undefined,
    actions: sumActionStats(rows, 'actions'),
    action_values: sumActionStats(rows, 'action_values'),
    outbound_clicks: sumActionStats(rows, 'outbound_clicks'),
    video_thruplay_watched_actions: sumActionStats(rows, 'video_thruplay_watched_actions'),
  };
}

function change(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function metricValue(insight: InsightsData, key: string, objective: string): number | null {
  const derived = deriveCampaignKpis(objective, insight);
  const match = [derived.primary, ...derived.secondary].find(metric => metric.key === key);
  if (match) return match.value;
  const raw = insight[key as keyof InsightsData];
  const value = typeof raw === 'string' ? Number(raw) : NaN;
  return Number.isFinite(value) ? value : null;
}

function buildPeriodSnapshot(insight: InsightsData, objective: string) {
  const derived = deriveCampaignKpis(objective, insight);
  const resultMetric = derived.secondary.find(metric => ['purchases', 'leads', 'landing_page_views', 'engagements', 'thruplays'].includes(metric.key));
  const clicks = Number(insight.clicks || 0);
  const resultCount = resultMetric?.value ?? null;
  return {
    objectiveFamily: derived.objectiveFamily,
    primary: derived.primary,
    secondary: derived.secondary,
    spend: Number(insight.spend || 0),
    impressions: Number(insight.impressions || 0),
    clicks,
    ctr: Number(insight.ctr || 0),
    cpc: Number(insight.cpc || 0),
    cpm: Number(insight.cpm || 0),
    conversionRate: resultCount != null && clicks > 0 ? (resultCount / clicks) * 100 : null,
  };
}

function buildPrompt(payload: RootCausePayload) {
  const sorted = [...payload.dailyInsights].sort((a, b) => (a.date_start ?? '').localeCompare(b.date_start ?? ''));
  const windowDays = Math.min(7, Math.floor(sorted.length / 2));
  const previousRows = sorted.slice(-(windowDays * 2), -windowDays);
  const currentRows = sorted.slice(-windowDays);
  const previous = aggregate(previousRows);
  const current = aggregate(currentRows);
  const currentSnapshot = buildPeriodSnapshot(current, payload.campaign.objective);
  const previousSnapshot = buildPeriodSnapshot(previous, payload.campaign.objective);
  const primaryKey = currentSnapshot.primary.key;
  const currentPrimary = metricValue(current, primaryKey, payload.campaign.objective);
  const previousPrimary = metricValue(previous, primaryKey, payload.campaign.objective);
  const adsets = payload.adsets.slice(0, 20).map(({ adset, insight }) => ({
    id: adset.id,
    name: adset.name,
    status: adset.status,
    optimizationGoal: adset.optimization_goal,
    kpis: deriveCampaignKpis(payload.campaign.objective, insight),
    spend: insight?.spend,
    ctr: insight?.ctr,
    cpc: insight?.cpc,
    cpm: insight?.cpm,
  }));

  return `Diagnose the campaign's primary KPI movement using the supplied evidence.

Campaign: ${JSON.stringify({ id: payload.campaign.id, name: payload.campaign.name, objective: payload.campaign.objective, status: payload.campaign.status })}
Currency: ${payload.currency}
Selected range: ${payload.dateFilter}
Comparison: latest ${windowDays} days versus preceding ${windowDays} days
Primary KPI calculation: ${JSON.stringify({ key: primaryKey, current: currentPrimary, previous: previousPrimary, changePercent: change(currentPrimary, previousPrimary) })}
Current period: ${JSON.stringify(currentSnapshot)}
Previous period: ${JSON.stringify(previousSnapshot)}
Current ad set context (not period-over-period): ${JSON.stringify(adsets)}

Rules:
- Select the objective-aware primary KPI. If it is unavailable, diagnose the most relevant available delivery metric and clearly lower confidence.
- Quantified drivers must use the supplied current and previous values. Set changePercent to 0 when it cannot be calculated and explain the limitation.
- Use causal metric identities where applicable: cost per result is driven by CPC and conversion rate; CPC is driven by CPM and CTR.
- A correlation is not proof. Creative fatigue, audience saturation, landing-page quality, auction pressure, and tracking loss must be labeled as hypotheses unless directly proven.
- Include 1-4 driver branches and 0-3 cause hypotheses per driver.
- nextCheck must be a specific verification step, not a generic recommendation.
- entityType/entityId may link only to the supplied campaign or ad sets. Use none and an empty ID when no entity is supported.`;
}

function sanitizeLinks(analysis: RootCauseAnalysis, payload: RootCausePayload): RootCauseAnalysis {
  const allowed = new Map<string, 'campaign' | 'adset'>([[payload.campaign.id, 'campaign']]);
  payload.adsets.forEach(({ adset }) => allowed.set(adset.id, 'adset'));
  const clean = <T extends { entityId: string; entityType: string }>(node: T): T => {
    const type = allowed.get(node.entityId);
    return type === node.entityType ? node : { ...node, entityType: 'none', entityId: '' };
  };
  return { ...analysis, drivers: analysis.drivers.map(driver => ({ ...clean(driver), causes: driver.causes.map(clean) })) };
}

export async function POST(request: NextRequest) {
  let payload: RootCausePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!payload.campaign?.id || !Array.isArray(payload.dailyInsights) || payload.dailyInsights.length < 4) {
    return NextResponse.json({ error: 'At least 4 days of campaign data are required.' }, { status: 422 });
  }

  try {
    const analysis = await callOpenAI<RootCauseAnalysis>(SYSTEM_PROMPT, buildPrompt(payload), {
      temperature: 0.2,
      maxOutputTokens: 5000,
      schema: { name: 'campaign_root_cause_analysis', value: ROOT_CAUSE_SCHEMA },
    });
    return NextResponse.json(sanitizeLinks(analysis, payload));
  } catch (error) {
    if (error instanceof OpenAIError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Root-cause analysis failed.' }, { status: 500 });
  }
}

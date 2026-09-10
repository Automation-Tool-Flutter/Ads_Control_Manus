import { NextRequest, NextResponse } from 'next/server';
import { callOpenAI, OpenAIError } from '@/lib/openai';
import { deriveCampaignKpis } from '@/lib/campaign-kpis';
import type { AudienceAdSet, AudienceBreakdownRow, AudienceData, AudienceIntelligence } from '@/lib/types/audience-intelligence';

const SYSTEM_PROMPT = `You are a Meta Ads audience analyst. Analyze only supplied targeting and breakdown metrics. Compare performance within comparable campaign objectives. Do not claim causal audience overlap from similar names. Shared targeting IDs are confirmed overlap signals, while saturation and narrowness are diagnostic signals unless reach estimates prove them. Never invent demographics, locations, IDs, conversion results, or targeting attributes. Return concise English content.`;

const SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    summary: { type: 'string' }, confidence: { type: 'integer', minimum: 0, maximum: 100 },
    topSegments: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
      dimension: { type: 'string', enum: ['age_gender', 'region', 'placement'] }, label: { type: 'string' }, score: { type: 'integer', minimum: 0, maximum: 100 }, primaryKpi: { type: 'string' }, value: { type: 'string' }, benchmark: { type: 'string' }, differencePercent: { type: 'number' }, finding: { type: 'string' }, recommendation: { type: 'string' },
    }, required: ['dimension', 'label', 'score', 'primaryKpi', 'value', 'benchmark', 'differencePercent', 'finding', 'recommendation'] } },
    overlapRisks: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
      adsetAId: { type: 'string' }, adsetAName: { type: 'string' }, adsetBId: { type: 'string' }, adsetBName: { type: 'string' }, sharedSignals: { type: 'array', items: { type: 'string' } }, risk: { type: 'string', enum: ['high', 'medium', 'low'] }, recommendation: { type: 'string' },
    }, required: ['adsetAId', 'adsetAName', 'adsetBId', 'adsetBName', 'sharedSignals', 'risk', 'recommendation'] } },
    saturationSignals: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
      adsetId: { type: 'string' }, adsetName: { type: 'string' }, status: { type: 'string', enum: ['healthy', 'watch', 'saturated', 'insufficient_data'] }, evidence: { type: 'string' }, recommendation: { type: 'string' },
    }, required: ['adsetId', 'adsetName', 'status', 'evidence', 'recommendation'] } },
    recommendations: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
      type: { type: 'string', enum: ['broad', 'interest', 'custom', 'lookalike', 'exclusion', 'placement'] }, title: { type: 'string' }, rationale: { type: 'string' }, steps: { type: 'array', items: { type: 'string' } }, adsetId: { type: 'string' }, confidence: { type: 'integer', minimum: 0, maximum: 100 },
    }, required: ['type', 'title', 'rationale', 'steps', 'adsetId', 'confidence'] } },
    audienceBrief: { type: 'object', additionalProperties: false, properties: {
      targetProfile: { type: 'string' }, ageGender: { type: 'string' }, geography: { type: 'string' }, placements: { type: 'string' }, expansion: { type: 'string' }, exclusions: { type: 'string' }, creativeMatch: { type: 'string' }, measurementPlan: { type: 'array', items: { type: 'string' } },
    }, required: ['targetProfile', 'ageGender', 'geography', 'placements', 'expansion', 'exclusions', 'creativeMatch', 'measurementPlan'] },
  },
  required: ['summary', 'confidence', 'topSegments', 'overlapRisks', 'saturationSignals', 'recommendations', 'audienceBrief'],
};

function targetingSignals(adset: AudienceAdSet) {
  const targeting = adset.targeting;
  return [
    ...(targeting?.interests ?? []).map(item => `interest:${item.id}:${item.name}`),
    ...(targeting?.behaviors ?? []).map(item => `behavior:${item.id}:${item.name}`),
    ...(targeting?.custom_audiences ?? []).map(item => `custom:${item.id}:${item.name ?? item.id}`),
    ...(targeting?.lookalike_audiences ?? []).map(item => `lookalike:${item.id}:${item.name ?? item.id}`),
  ];
}

function confirmedOverlaps(adsets: AudienceAdSet[]) {
  const active = adsets.filter(item => item.status === 'ACTIVE');
  const pairs: Array<{ adsetAId: string; adsetAName: string; adsetBId: string; adsetBName: string; sharedSignals: string[] }> = [];
  for (let i = 0; i < active.length; i += 1) for (let j = i + 1; j < active.length; j += 1) {
    const a = new Set(targetingSignals(active[i]));
    const shared = targetingSignals(active[j]).filter(signal => a.has(signal));
    if (shared.length) pairs.push({ adsetAId: active[i].id, adsetAName: active[i].name, adsetBId: active[j].id, adsetBName: active[j].name, sharedSignals: shared });
  }
  return pairs.slice(0, 30);
}

function prepareRows(rows: AudienceBreakdownRow[], dimension: string, objectives: Map<string, string>) {
  return [...rows].sort((a, b) => Number(b.spend || 0) - Number(a.spend || 0)).slice(0, 120).map(row => {
    const objective = objectives.get(row.adset_id) ?? '';
    return { dimension, ...row, objective, objectiveKpis: deriveCampaignKpis(objective, row) };
  });
}

function buildPrompt(data: AudienceData, currency: string) {
  const objectives = new Map(data.adsets.map(adset => [adset.id, adset.campaign?.objective ?? '']));
  const adsets = data.adsets.slice(0, 100).map(adset => ({
    id: adset.id, name: adset.name, status: adset.status, campaign: adset.campaign,
    optimizationGoal: adset.optimization_goal, targeting: adset.targeting,
    metrics: adset.insights?.data?.[0], objectiveKpis: deriveCampaignKpis(adset.campaign?.objective, adset.insights?.data?.[0]),
  }));
  return `Create an audience intelligence report for the last 30 days. Currency: ${currency}.
Unavailable breakdowns: ${data.unavailableBreakdowns.join(', ') || 'none'}
AD SETS AND TARGETING: ${JSON.stringify(adsets)}
CONFIRMED SHARED TARGETING SIGNALS: ${JSON.stringify(confirmedOverlaps(data.adsets))}
AGE/GENDER BREAKDOWNS: ${JSON.stringify(prepareRows(data.ageGender, 'age_gender', objectives))}
REGION BREAKDOWNS: ${JSON.stringify(prepareRows(data.regions, 'region', objectives))}
PLACEMENT BREAKDOWNS: ${JSON.stringify(prepareRows(data.placements, 'placement', objectives))}

Rules:
- Return at most 12 top segments, ranking objective outcome efficiency before CTR/CPC.
- Segment benchmarks must compare rows with the same objective family when possible. State insufficient context instead of fabricating a benchmark.
- overlapRisks may only use pairs in CONFIRMED SHARED TARGETING SIGNALS and exact IDs.
- Provide one saturation status per supplied ad set with spend. High frequency alone is a watch signal, not proof of saturation.
- Recommendations must use an exact ad set ID, or an empty string only for an account-wide recommendation.
- Do not advise demographic exclusion from weak or low-volume evidence. Include a measurement plan and controlled-test steps.`;
}

function sanitize(analysis: AudienceIntelligence, data: AudienceData): AudienceIntelligence {
  const adsets = new Map(data.adsets.map(item => [item.id, item.name]));
  const overlapKeys = new Set(confirmedOverlaps(data.adsets).map(item => [item.adsetAId, item.adsetBId].sort().join(':')));
  return {
    ...analysis,
    overlapRisks: analysis.overlapRisks.filter(item => adsets.has(item.adsetAId) && adsets.has(item.adsetBId) && overlapKeys.has([item.adsetAId, item.adsetBId].sort().join(':'))),
    saturationSignals: analysis.saturationSignals.filter(item => adsets.has(item.adsetId)).map(item => ({ ...item, adsetName: adsets.get(item.adsetId) ?? item.adsetName })),
    recommendations: analysis.recommendations.filter(item => item.adsetId === '' || adsets.has(item.adsetId)),
  };
}

export async function POST(request: NextRequest) {
  let body: { data?: AudienceData; currency?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (!body.data?.adsets?.length) return NextResponse.json({ error: 'No ad sets are available for audience analysis.' }, { status: 422 });
  try {
    const analysis = await callOpenAI<AudienceIntelligence>(SYSTEM_PROMPT, buildPrompt(body.data, body.currency ?? 'USD'), {
      temperature: 0.2, maxOutputTokens: 8000, schema: { name: 'audience_intelligence', value: SCHEMA },
    });
    return NextResponse.json(sanitize(analysis, body.data));
  } catch (error) {
    if (error instanceof OpenAIError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Audience intelligence analysis failed.' }, { status: 500 });
  }
}

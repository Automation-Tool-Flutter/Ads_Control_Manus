import { NextRequest, NextResponse } from 'next/server';
import { buildBudgetAllocations, getBudgetRange } from '@/lib/budget-optimizer';
import { callOpenAI, OpenAIError } from '@/lib/openai';
import type {
  BudgetCampaignEvaluation,
  BudgetOptimizerPayload,
  BudgetPlan,
} from '@/lib/types/budget-optimizer';

const SYSTEM_PROMPT = `You are a Meta Ads budget allocation analyst. Score every supplied campaign from 0 to 100 \
for its suitability to receive budget toward the user's selected goal. Use only supplied metrics. Never invent \
conversions, revenue, CPA, or ROAS. When goal-specific conversion data is absent, lower confidence and clearly warn \
the user. Return an evaluation for every campaign using its exact ID.`;

const EVALUATION_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    confidence: { type: 'integer', minimum: 0, maximum: 100 },
    warnings: { type: 'array', items: { type: 'string' } },
    evaluations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          campaignId: { type: 'string' },
          score: { type: 'number', minimum: 0, maximum: 100 },
          direction: { type: 'string', enum: ['increase', 'hold', 'decrease'] },
          rationale: { type: 'string' },
          expectedImpact: { type: 'string' },
        },
        required: ['campaignId', 'score', 'direction', 'rationale', 'expectedImpact'],
      },
    },
  },
  required: ['summary', 'confidence', 'warnings', 'evaluations'],
};

interface AIEvaluationResponse {
  summary: string;
  confidence: number;
  warnings: string[];
  evaluations: BudgetCampaignEvaluation[];
}

function buildPrompt(payload: BudgetOptimizerPayload) {
  return `Create a budget allocation evaluation.

Goal: ${payload.goal}
Mode: ${payload.mode}
Currency: ${payload.currency}
Analysis period: ${payload.dateFilter}
Target total daily budget (raw Meta units): ${payload.targetTotalBudgetRaw}

CAMPAIGNS:
${JSON.stringify(payload.campaigns, null, 2)}

Evaluation rules:
- Evaluate campaigns relative to other campaigns with the same or comparable objective.
- Use each campaign's objectiveKpis as the decision hierarchy. Revenue/ROAS goals prioritize sales ROAS, purchase value and CPA; conversions prioritize objective result count and cost; leads prioritize CPL and lead count; traffic prioritizes cost per landing-page view and landing-page views.
- Use CTR/CPC/CPM only as diagnostic fallbacks. Never equate clicks with revenue or conversions.
- A campaign with no spend should have low confidence, not an invented performance conclusion.
- confidence is an integer percentage from 0 to 100, where 100 means highest confidence.
- direction describes whether the campaign deserves more, similar, or less budget.
- expectedImpact must be qualitative unless the supplied data supports a numeric claim.`;
}

export async function POST(request: NextRequest) {
  let payload: BudgetOptimizerPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!Array.isArray(payload.campaigns) || payload.campaigns.length === 0) {
    return NextResponse.json({ error: 'No active daily-budget campaigns are available.' }, { status: 400 });
  }

  if (!['revenue', 'conversions', 'leads', 'traffic', 'roas'].includes(payload.goal)) {
    return NextResponse.json({ error: 'Optimization goal is invalid.' }, { status: 400 });
  }
  if (!['conservative', 'balanced', 'aggressive'].includes(payload.mode)) {
    return NextResponse.json({ error: 'Budget mode is invalid.' }, { status: 400 });
  }

  const targetTotal = Number(payload.targetTotalBudgetRaw);
  if (!Number.isInteger(targetTotal) || targetTotal <= 0) {
    return NextResponse.json({ error: 'Target daily budget is invalid.' }, { status: 400 });
  }

  const range = getBudgetRange(payload.campaigns, payload.mode);
  if (targetTotal < range.min || targetTotal > range.max) {
    return NextResponse.json({
      error: `For ${payload.mode} mode, target budget must stay within the permitted range.`,
      feasibleMinBudgetRaw: String(range.min),
      feasibleMaxBudgetRaw: String(range.max),
    }, { status: 422 });
  }

  try {
    const ai = await callOpenAI<AIEvaluationResponse>(
      SYSTEM_PROMPT,
      buildPrompt(payload),
      {
        maxOutputTokens: 4096,
        schema: { name: 'budget_campaign_evaluations', value: EVALUATION_SCHEMA },
      },
    );

    const validIds = new Set(payload.campaigns.map(campaign => campaign.id));
    const uniqueEvaluations = new Map<string, BudgetCampaignEvaluation>();
    for (const evaluation of ai.evaluations) {
      if (validIds.has(evaluation.campaignId) && !uniqueEvaluations.has(evaluation.campaignId)) {
        uniqueEvaluations.set(evaluation.campaignId, evaluation);
      }
    }

    const allocations = buildBudgetAllocations(
      payload.campaigns,
      Array.from(uniqueEvaluations.values()),
      targetTotal,
      payload.mode,
    );
    const allocatedTotal = allocations.reduce(
      (sum, allocation) => sum + Number(allocation.proposedDailyBudgetRaw),
      0,
    );
    if (allocatedTotal !== targetTotal) {
      throw new Error('Unable to create an exact budget allocation for this target.');
    }

    const plan: BudgetPlan = {
      summary: ai.summary,
      goal: payload.goal,
      mode: payload.mode,
      confidence: ai.confidence,
      currency: payload.currency,
      currentTotalBudgetRaw: String(range.current),
      targetTotalBudgetRaw: String(targetTotal),
      feasibleMinBudgetRaw: String(range.min),
      feasibleMaxBudgetRaw: String(range.max),
      warnings: ai.warnings,
      allocations,
    };

    return NextResponse.json(plan);
  } catch (error) {
    if (error instanceof OpenAIError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Budget optimization failed.' }, { status: 500 });
  }
}

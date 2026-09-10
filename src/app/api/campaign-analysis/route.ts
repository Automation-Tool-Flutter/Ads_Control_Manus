import { NextRequest, NextResponse } from "next/server";
import type { GeminiAnalysis } from "@/lib/types/optimize";
import type { CampaignKpiSummary } from "@/lib/campaign-kpis";
import type { InsightActionValue } from "@/lib/types";
import { callOpenAI, OpenAIError } from "@/lib/openai";
import type { AccountLearningProfile } from "@/lib/types/ai-learning";

const SYSTEM_PROMPT = `You are a Meta Ads campaign optimization copilot. Analyze only the supplied data, \
reference exact campaign IDs, and produce conservative actions that a media buyer can review and apply. \
Never invent campaigns, metrics, conversions, or budgets. All content must be in English.`;

interface CampaignPayloadItem {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  reach?: string;
  frequency?: string;
  actions?: InsightActionValue[];
  action_values?: InsightActionValue[];
  objectiveKpis: CampaignKpiSummary;
}

interface CampaignAnalysisPayload {
  currency: string;
  dateFilter: string;
  campaigns: CampaignPayloadItem[];
  collectedAt: string;
  target?: { metric: string; value: number };
  learningProfile?: AccountLearningProfile | null;
}

const ACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: {
      type: "string",
      enum: ["pause_campaign", "activate_campaign", "update_campaign_budget", "none"],
    },
    entityType: { type: "string", enum: ["campaign"] },
    entityId: { type: "string" },
    entityName: { type: "string" },
    currentDailyBudget: { type: "string" },
    proposedDailyBudget: { type: "string" },
    reason: { type: "string" },
    risk: { type: "string", enum: ["high", "medium", "low"] },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    expectedImpact: { type: "string" },
    canApply: { type: "boolean" },
  },
  required: [
    "type", "entityType", "entityId", "entityName", "currentDailyBudget",
    "proposedDailyBudget", "reason", "risk", "confidence", "expectedImpact", "canApply",
  ],
};

const CAMPAIGN_ANALYSIS_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    overallScore: { type: "number", minimum: 0, maximum: 100 },
    objectiveAssessments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          campaignId: { type: "string" },
          campaignName: { type: "string" },
          objectiveFamily: { type: "string", enum: ["sales", "leads", "traffic", "engagement", "video", "awareness", "other"] },
          primaryKpi: { type: "string" },
          primaryValue: { type: "string" },
          secondaryKpis: { type: "array", items: { type: "string" } },
          target: { type: "string" },
          status: { type: "string", enum: ["on_track", "near_target", "off_track", "insufficient_data"] },
          confidence: { type: "integer", minimum: 0, maximum: 100 },
          rationale: { type: "string" },
        },
        required: ["campaignId", "campaignName", "objectiveFamily", "primaryKpi", "primaryValue", "secondaryKpis", "target", "status", "confidence", "rationale"],
      },
    },
    angles: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          level: { type: "string", enum: ["account", "campaign", "adset", "ad", "audience"] },
          score: { type: "number", minimum: 0, maximum: 100 },
          strengths: { type: "array", items: { type: "string" } },
          issues: { type: "array", items: { type: "string" } },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                priority: { type: "string", enum: ["high", "medium", "low"] },
                metric: { type: "string" },
                action: ACTION_SCHEMA,
              },
              required: ["title", "description", "priority", "metric", "action"],
            },
          },
        },
        required: ["name", "level", "score", "strengths", "issues", "recommendations"],
      },
    },
  },
  required: ["summary", "overallScore", "objectiveAssessments", "angles"],
};

function buildPrompt(
  payload: CampaignAnalysisPayload,
  isSingle: boolean,
): string {
  const { campaigns, currency, dateFilter } = payload;

  // Cap at 25 to keep the structured response within model limits. Campaigns
  // without spend remain visible so the model can explicitly flag missing data.
  const topCampaigns = [...campaigns]
    .sort((a, b) => parseFloat(b.spend ?? "0") - parseFloat(a.spend ?? "0"))
    .slice(0, 25);

  function campaignLine(c: CampaignPayloadItem): string {
    const budget = c.daily_budget
      ? `${c.daily_budget} raw daily_budget units/day`
      : c.lifetime_budget
        ? `${c.lifetime_budget} raw lifetime_budget units`
        : "no budget";
    const spend = c.spend ? `${c.spend} ${currency}` : "no spend";
    const impr = c.impressions ?? "0";
    const ctr = c.ctr ? `${parseFloat(c.ctr).toFixed(2)}%` : "—";
    const cpc = c.cpc ? `${c.cpc} ${currency}` : "—";
    const cpm = c.cpm ? `${c.cpm} ${currency}` : "—";
    const kpis = JSON.stringify(c.objectiveKpis);
    return `ID ${c.id} | [${c.status}] ${c.name} (obj: ${c.objective}) | budget: ${budget} | spend: ${spend} | impr: ${impr} | CTR: ${ctr} | CPC: ${cpc} | CPM: ${cpm} | objective KPIs: ${kpis}`;
  }

  const lines: string[] = topCampaigns.map(campaignLine);

  const angles = isSingle
    ? [
        "Performance Overview",
        "Budget Efficiency",
        "Audience Fit",
        "Optimization Actions",
      ]
    : [
        "Campaign Comparison",
        "Budget Allocation",
        "Objective Effectiveness",
        "Quick Wins",
      ];

  const angleSchemas = angles
    .map((name, i) => {
      const levels = ["account", "campaign", "adset", "ad"];
      return `    {
      "name": "${name}",
      "level": "${levels[i]}",
      "score": <0-100>,
      "strengths": ["strength with specific numbers"],
      "issues": ["issue with specific numbers"],
      "recommendations": [
        {
          "title": "Short action title",
          "description": "Detailed how-to with context",
          "priority": "high|medium|low",
          "metric": "spend|CTR|CPC|...",
          "action": {
            "type": "pause_campaign|activate_campaign|update_campaign_budget|none",
            "entityType": "campaign",
            "entityId": "exact campaign id or empty string",
            "entityName": "exact campaign name or empty string",
            "currentDailyBudget": "raw daily_budget value or empty string",
            "proposedDailyBudget": "raw proposed daily_budget value or empty string",
            "reason": "why this change should be made",
            "risk": "high|medium|low",
            "confidence": <0-100>,
            "expectedImpact": "measurable expected outcome without fabricated certainty",
            "canApply": <true only when the action is supported and all values are present>
          }
        }
      ]
    }`;
    })
    .join(",\n");

  const targetLine = payload.target
    ? `USER KPI TARGET: ${payload.target.metric} = ${payload.target.value}. Apply it only to campaigns whose primary KPI matches this metric.`
    : "USER KPI TARGET: none. Do not invent a numeric target; use insufficient_data when a status cannot be supported.";
  const learningLine = payload.learningProfile
    ? `ACCOUNT LEARNING PROFILE (historical evidence only; current campaign data takes priority): ${JSON.stringify(payload.learningProfile)}`
    : "ACCOUNT LEARNING PROFILE: not available.";

  return `Analyze the following Facebook Ads campaign data for period: ${dateFilter}. Currency: ${currency}.

${targetLine}
${learningLine}

CAMPAIGNS:
${lines.join("\n")}

Return a JSON object with this EXACT schema (no extra fields):
{
  "summary": "2-3 sentence overview of overall campaign performance",
  "overallScore": <number 0-100>,
  "objectiveAssessments": [
    {
      "campaignId": "exact campaign id",
      "campaignName": "exact campaign name",
      "objectiveFamily": "sales|leads|traffic|engagement|video|awareness|other",
      "primaryKpi": "objective-aware KPI label",
      "primaryValue": "formatted value with unit or unavailable",
      "secondaryKpis": ["label: value"],
      "target": "user target, benchmark context, or not provided",
      "status": "on_track|near_target|off_track|insufficient_data",
      "confidence": <0-100>,
      "rationale": "one evidence-based sentence"
    }
  ],
  "angles": [
${angleSchemas}
  ]
}

Scoring: 80-100 Excellent, 60-79 Good, 40-59 Needs Improvement, 0-39 Poor.
Each angle: at least 1 strength, 1 issue, 1-3 recommendations. Reference actual numbers.

OBJECTIVE KPI RULES:
- Sales: primary ROAS; secondary purchases, CPA and conversion value.
- Leads: primary CPL; secondary lead count.
- Traffic: primary cost per landing-page view; secondary landing-page views and link clicks.
- Engagement: primary cost per engagement; secondary engagements.
- Video: primary cost per ThruPlay; secondary ThruPlays.
- Awareness: primary CPM; secondary reach and frequency.
- CTR/CPC are diagnostic metrics, not the primary success KPI when objective outcome data exists.
- For ROAS higher is better. For CPL, CPA, cost per LPV, cost per engagement, cost per ThruPlay and CPM lower is better.
- Produce exactly one objectiveAssessments item per campaign shown in CAMPAIGNS. If the required result metric is absent, mark insufficient_data and lower confidence.

ACTION RULES:
- Supported executable actions are pause_campaign, activate_campaign, and update_campaign_budget.
- Use the exact campaign id, name, status, and raw daily_budget from CAMPAIGNS.
- Never propose a budget action for a campaign without daily_budget.
- Budget changes must be conservative: at most 20% up or down in one action.
- proposedDailyBudget must be a positive integer string in the same raw unit as daily_budget.
- Set type to none and canApply to false when evidence is insufficient or the recommendation is not executable.
- Do not activate a paused campaign unless the supplied performance data clearly supports it.
- CTR/CPC/CPM alone do not prove profitability; explicitly lower confidence when conversion data is unavailable.
Return only JSON, no markdown.`;
}

export async function POST(req: NextRequest) {
  let body: CampaignAnalysisPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.campaigns || body.campaigns.length === 0) {
    return NextResponse.json({ error: "No campaigns to analyze." }, { status: 400 });
  }

  const hasSpend = body.campaigns.some((c) => c.spend && parseFloat(c.spend) > 0);
  if (!hasSpend) {
    return NextResponse.json({ error: "No performance data to analyze." }, { status: 422 });
  }

  try {
    const analysis = await callOpenAI<GeminiAnalysis>(
      SYSTEM_PROMPT,
      buildPrompt(body, body.campaigns.length === 1),
      {
        maxOutputTokens: 8192,
        schema: { name: "campaign_action_analysis", value: CAMPAIGN_ANALYSIS_SCHEMA },
      },
    );
    return NextResponse.json(analysis);
  } catch (err) {
    if (err instanceof OpenAIError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Analysis failed." }, { status: 500 });
  }
}

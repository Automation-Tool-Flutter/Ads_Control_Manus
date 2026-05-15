import { NextRequest, NextResponse } from "next/server";
import type { GeminiAnalysis } from "@/lib/types/optimize";
import { callGemini, GeminiError } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are a Facebook Ads performance analyst with deep expertise in paid advertising, \
campaign optimization, and budget management. Analyze campaign data and provide specific, \
actionable recommendations. Return valid JSON according to the requested schema. All content must be in English.`;

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
}

interface CampaignAnalysisPayload {
  currency: string;
  dateFilter: string;
  campaigns: CampaignPayloadItem[];
  collectedAt: string;
}

function buildPrompt(
  payload: CampaignAnalysisPayload,
  isSingle: boolean,
): string {
  const { campaigns, currency, dateFilter } = payload;

  const withSpend = campaigns.filter((c) => c.spend && parseFloat(c.spend) > 0);
  const noSpend = campaigns.filter(
    (c) => !c.spend || parseFloat(c.spend) === 0,
  );

  // Cap top 25 by spend
  const topCampaigns = withSpend
    .sort((a, b) => parseFloat(b.spend ?? "0") - parseFloat(a.spend ?? "0"))
    .slice(0, 25);

  function campaignLine(c: CampaignPayloadItem): string {
    const budget = c.daily_budget
      ? `${c.daily_budget} ${currency}/day`
      : c.lifetime_budget
        ? `${c.lifetime_budget} ${currency} lifetime`
        : "no budget";
    const spend = c.spend ? `${c.spend} ${currency}` : "no spend";
    const impr = c.impressions ?? "0";
    const ctr = c.ctr ? `${parseFloat(c.ctr).toFixed(2)}%` : "—";
    const cpc = c.cpc ? `${c.cpc} ${currency}` : "—";
    const cpm = c.cpm ? `${c.cpm} ${currency}` : "—";
    return `[${c.status}] ${c.name} (obj: ${c.objective}) | budget: ${budget} | spend: ${spend} | impr: ${impr} | CTR: ${ctr} | CPC: ${cpc} | CPM: ${cpm}`;
  }

  const lines: string[] = topCampaigns.map(campaignLine);

  if (noSpend.length > 0) {
    lines.push(
      `\nNo spend this period (${noSpend.length} campaigns): ${noSpend.map((c) => c.name).join(", ")}`,
    );
  }

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
        { "title": "Short action title", "description": "Detailed how-to with context", "priority": "high|medium|low", "metric": "spend|CTR|CPC|..." }
      ]
    }`;
    })
    .join(",\n");

  return `Analyze the following Facebook Ads campaign data for period: ${dateFilter}. Currency: ${currency}.

CAMPAIGNS:
${lines.join("\n")}

Return a JSON object with this EXACT schema (no extra fields):
{
  "summary": "2-3 sentence overview of overall campaign performance",
  "overallScore": <number 0-100>,
  "angles": [
${angleSchemas}
  ]
}

Scoring: 80-100 Excellent, 60-79 Good, 40-59 Needs Improvement, 0-39 Poor.
Each angle: at least 1 strength, 1 issue, 1-3 recommendations. Reference actual numbers.
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
    const analysis = await callGemini<GeminiAnalysis>(
      SYSTEM_PROMPT,
      buildPrompt(body, body.campaigns.length === 1),
      { temperature: 0.3, maxOutputTokens: 3072 },
    );
    return NextResponse.json(analysis);
  } catch (err) {
    if (err instanceof GeminiError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Analysis failed." }, { status: 500 });
  }
}

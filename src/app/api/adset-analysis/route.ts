import { NextRequest, NextResponse } from "next/server";
import type { GeminiAnalysis } from "@/lib/types/optimize";
import { callGemini, GeminiError } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are a senior Facebook Ads performance analyst with deep expertise in ad set optimization, \
audience targeting, bid strategy, and media buying efficiency. Your analysis must be data-driven, specific, and \
immediately actionable. Reference exact numbers from the data. Flag audience fatigue (frequency > 3), poor delivery \
(CPM outliers), budget waste (high spend + low CTR), and targeting mismatches. Return valid JSON only. All content in English.`;

interface TargetingPayload {
  age_min?: number;
  age_max?: number;
  genders?: number[];
  geo_locations?: {
    countries?: string[];
    cities?: { name: string }[];
    regions?: { name: string }[];
  };
}

interface AdSetPayloadItem {
  id: string;
  name: string;
  status: string;
  optimization_goal?: string;
  billing_event?: string;
  daily_budget?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
}

interface AdSetAnalysisPayload {
  currency: string;
  dateFilter: string;
  adsets: AdSetPayloadItem[];
  targeting?: TargetingPayload;
  collectedAt: string;
}

function formatTargeting(t?: TargetingPayload): string {
  if (!t) return "not specified";
  const parts: string[] = [];
  if (t.age_min || t.age_max) parts.push(`age ${t.age_min ?? "?"}-${t.age_max ?? "?"}`);
  if (t.genders && t.genders.length > 0) {
    const gMap: Record<number, string> = { 1: "Male", 2: "Female" };
    parts.push(t.genders.map(g => gMap[g] ?? String(g)).join("/"));
  }
  if (t.geo_locations) {
    const locs: string[] = [];
    if (t.geo_locations.countries?.length) locs.push(...t.geo_locations.countries);
    if (t.geo_locations.cities?.length) locs.push(...t.geo_locations.cities.map(c => c.name));
    if (t.geo_locations.regions?.length) locs.push(...t.geo_locations.regions.map(r => r.name));
    if (locs.length) parts.push(`geo: ${locs.join(", ")}`);
  }
  return parts.length > 0 ? parts.join(" | ") : "broad";
}

function buildPrompt(payload: AdSetAnalysisPayload, isSingle: boolean): string {
  const { adsets, currency, dateFilter, targeting } = payload;

  const withSpend = adsets.filter((a) => a.spend && parseFloat(a.spend) > 0);
  const noSpend = adsets.filter((a) => !a.spend || parseFloat(a.spend) === 0);

  const topAdSets = withSpend
    .sort((a, b) => parseFloat(b.spend ?? "0") - parseFloat(a.spend ?? "0"))
    .slice(0, 25);

  function adsetLine(a: AdSetPayloadItem): string {
    const budget = a.daily_budget ? `${a.daily_budget} ${currency}/day` : "no budget";
    const spend = a.spend ? `${a.spend} ${currency}` : "no spend";
    const impr = a.impressions ? parseInt(a.impressions).toLocaleString() : "0";
    const reach = a.reach ? parseInt(a.reach).toLocaleString() : "—";
    const freq = a.frequency ? parseFloat(a.frequency).toFixed(2) : "—";
    const ctr = a.ctr ? `${parseFloat(a.ctr).toFixed(2)}%` : "—";
    const cpc = a.cpc ? `${parseFloat(a.cpc).toFixed(2)} ${currency}` : "—";
    const cpm = a.cpm ? `${parseFloat(a.cpm).toFixed(2)} ${currency}` : "—";
    const goal = a.optimization_goal ?? "unknown";
    const billing = a.billing_event ?? "unknown";
    return `[${a.status}] "${a.name}"
  Goal: ${goal} | Billing: ${billing} | Budget: ${budget}
  Spend: ${spend} | Impr: ${impr} | Reach: ${reach} | Freq: ${freq}
  CTR: ${ctr} | CPC: ${cpc} | CPM: ${cpm}`;
  }

  const lines: string[] = topAdSets.map(adsetLine);

  if (noSpend.length > 0) {
    lines.push(
      `\nNo spend this period (${noSpend.length} ad sets): ${noSpend.map((a) => `"${a.name}"`).join(", ")}`,
    );
  }

  const targetingStr = formatTargeting(targeting);

  const angles = isSingle
    ? [
        "Performance & Delivery",
        "Audience & Targeting",
        "Bid & Budget Efficiency",
        "Optimization Actions",
      ]
    : [
        "Ad Set Comparison",
        "Audience Overlap & Targeting",
        "Budget & Bid Efficiency",
        "Quick Wins",
      ];

  const angleSchemas = angles
    .map((name) => {
      return `    {
      "name": "${name}",
      "level": "adset",
      "score": <0-100>,
      "strengths": ["strength with specific numbers from the data"],
      "issues": ["issue with specific numbers and why it matters"],
      "recommendations": [
        { "title": "Short action title", "description": "Concrete step-by-step action with expected impact", "priority": "high|medium|low", "metric": "CTR|CPC|CPM|frequency|reach|spend|..." }
      ]
    }`;
    })
    .join(",\n");

  return `Analyze the following Facebook Ads ad set data.
Period: ${dateFilter} | Currency: ${currency}
Targeting context: ${targetingStr}

AD SETS:
${lines.join("\n\n")}

ANALYSIS GUIDELINES:
- Frequency > 3.0: flag audience fatigue, recommend expanding audience or refreshing creative
- CTR < 0.5%: poor creative relevance or wrong audience
- CTR > 3%: strong creative/audience match
- CPM > 2x account average: delivery issues or narrow audience
- Frequency data absent: note that reach/frequency weren't available for this period
- CPC should be evaluated against optimization goal (LINK_CLICKS, LANDING_PAGE_VIEWS, etc.)
- Budget utilization: if spend < 80% of daily_budget × days, flag under-delivery
- For targeting: evaluate whether age/gender/geo aligns with the optimization goal

Return a JSON object with this EXACT schema (no extra fields):
{
  "summary": "3-4 sentence overview referencing key metrics (CTR, CPM, frequency, spend)",
  "overallScore": <number 0-100>,
  "angles": [
${angleSchemas}
  ]
}

Scoring: 80-100 Excellent, 60-79 Good, 40-59 Needs Improvement, 0-39 Poor.
Each angle: at least 2 strengths/issues, 1-3 specific recommendations with expected impact.
Return only JSON, no markdown, no extra text.`;
}


export async function POST(req: NextRequest) {
  let body: AdSetAnalysisPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.adsets || body.adsets.length === 0) {
    return NextResponse.json({ error: "No ad sets to analyze." }, { status: 400 });
  }

  const hasSpend = body.adsets.some((a) => a.spend && parseFloat(a.spend) > 0);
  if (!hasSpend) {
    return NextResponse.json({ error: "No performance data to analyze." }, { status: 422 });
  }

  try {
    const analysis = await callGemini<GeminiAnalysis>(
      SYSTEM_PROMPT,
      buildPrompt(body, body.adsets.length === 1),
      { temperature: 0.3, maxOutputTokens: 3072 },
    );
    return NextResponse.json(analysis);
  } catch (err) {
    if (err instanceof GeminiError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Analysis failed." }, { status: 500 });
  }
}

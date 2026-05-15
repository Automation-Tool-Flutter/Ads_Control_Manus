import { NextRequest, NextResponse } from "next/server";
import type { GeminiAnalysis, OptimizePayload } from "@/lib/types/optimize";
import { callGemini, GeminiError } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are a Meta/Facebook advertising optimization expert with over 10 years of experience. \
Your task is to analyze ad performance data and provide specific, actionable optimization recommendations. \
Return valid JSON according to the requested schema. All content must be in English.`;

function buildUserPrompt(payload: OptimizePayload): string {
  const data = JSON.stringify(payload, null, 2);

  return `Analyze the following Meta ad data and return JSON according to the schema below.

IMPORTANT NOTES:
- account.amount_spent is in cents (divide by 100 to get actual currency amount)
- insights.spend is already in the actual currency unit (no division needed)
- Analysis period: ${payload.datePreset}
- Data collected at: ${payload.collectedAt}

DATA:
${data}

REQUIRED JSON SCHEMA:
{
  "summary": "2-3 sentence overview of account performance",
  "overallScore": <number 0-100>,
  "angles": [
    {
      "name": "Account",
      "level": "account",
      "score": <0-100>,
      "strengths": ["strength 1", "strength 2"],
      "issues": ["issue 1", "issue 2"],
      "recommendations": [
        {
          "title": "Recommendation title",
          "description": "Detailed description and how to implement",
          "priority": "high|medium|low",
          "metric": "CTR|CPC|CPM|ROAS|..."
        }
      ]
    },
    {
      "name": "Campaigns",
      "level": "campaign",
      "score": <0-100>,
      "strengths": [...],
      "issues": [...],
      "recommendations": [...]
    },
    {
      "name": "Ad Sets",
      "level": "adset",
      "score": <0-100>,
      "strengths": [...],
      "issues": [...],
      "recommendations": [...]
    },
    {
      "name": "Ads",
      "level": "ad",
      "score": <0-100>,
      "strengths": [...],
      "issues": [...],
      "recommendations": [...]
    },
    {
      "name": "Audience",
      "level": "audience",
      "score": <0-100>,
      "strengths": [...],
      "issues": [...],
      "recommendations": [...]
    }
  ]
}

SCORING SCALE:
- 80-100: Excellent
- 60-79: Good
- 40-59: Needs Improvement
- 0-39: Critical

Each angle needs at least 1 strength, 1 issue, and 1-3 specific recommendations.
All content must be in English. Return only JSON, no other text.`;
}

export async function POST(req: NextRequest) {
  let payload: OptimizePayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request data." }, { status: 400 });
  }

  try {
    const analysis = await callGemini<GeminiAnalysis>(
      SYSTEM_PROMPT,
      buildUserPrompt(payload),
      { temperature: 0.3, maxOutputTokens: 4096, responseMimeType: "application/json" },
    );
    return NextResponse.json(analysis);
  } catch (err) {
    if (err instanceof GeminiError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Analysis failed." }, { status: 500 });
  }
}

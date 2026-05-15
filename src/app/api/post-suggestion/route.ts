import { NextRequest, NextResponse } from 'next/server';
import { callGemini, GeminiError } from '@/lib/gemini';

const SYSTEM_PROMPT = `You are an expert Facebook content writer. \
Your job is to generate 3 different Facebook post variations based on the given topic and tone. \
Each variation must have a different structure, opening hook, and angle so the user can choose. \
Posts must be natural, engaging, and suitable for Facebook. \
Return only JSON, no markdown, no extra text.`;

function buildPrompt(topic: string, tone: string, language: string): string {
  const toneLabel =
    tone === 'professional' ? 'professional, polished' :
    tone === 'promotional' ? 'promotional, strong call-to-action' :
    'casual, friendly, natural';

  const langNote = language === 'vi' ? 'Write in Vietnamese.' : 'Write in English.';

  return `Topic / keywords: "${topic}"
Tone: ${toneLabel}
${langNote}

Generate 3 Facebook post variations with different openings and structures.
Return JSON in this format: { "suggestions": ["post 1...", "post 2...", "post 3..."] }
Each post should be 50-300 words. Return only JSON.`;
}

export async function POST(req: NextRequest) {
  let payload: { topic: string; tone?: string; language?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (!payload.topic?.trim()) {
    return NextResponse.json({ error: 'Topic is required.' }, { status: 400 });
  }

  try {
    const result = await callGemini<{ suggestions: string[] }>(
      SYSTEM_PROMPT,
      buildPrompt(payload.topic, payload.tone ?? 'casual', payload.language ?? 'vi'),
      { temperature: 0.8, maxOutputTokens: 4096 },
    );

    if (!Array.isArray(result.suggestions) || result.suggestions.length === 0) {
      return NextResponse.json({ error: 'AI returned no suggestions.' }, { status: 502 });
    }

    return NextResponse.json({ suggestions: result.suggestions });
  } catch (err) {
    if (err instanceof GeminiError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: 'Analysis failed.' }, { status: 500 });
  }
}

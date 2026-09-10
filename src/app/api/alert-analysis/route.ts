import { NextRequest, NextResponse } from 'next/server';
import { callOpenAI, OpenAIError } from '@/lib/openai';
import type { AIAlert, AlertCandidate, AlertCenterResult } from '@/lib/types/alerts';

const SYSTEM_PROMPT = `You are a Meta Ads alert triage assistant. Explain deterministic anomaly candidates without changing their measured values, severity, entity, or comparison. Do not claim causation from correlation. Recommend a verification-first action when tracking, creative fatigue, audience saturation, or auction pressure is only a signal. Return concise English content.`;

const ALERT_SCHEMA: Record<string, unknown> = {
  type: 'object', additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    evaluations: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          alertId: { type: 'string' },
          title: { type: 'string' },
          explanation: { type: 'string' },
          recommendedAction: { type: 'string' },
          confidence: { type: 'integer', minimum: 0, maximum: 100 },
        },
        required: ['alertId', 'title', 'explanation', 'recommendedAction', 'confidence'],
      },
    },
  },
  required: ['summary', 'evaluations'],
};

interface AIResult {
  summary: string;
  evaluations: Array<{ alertId: string; title: string; explanation: string; recommendedAction: string; confidence: number }>;
}

export async function POST(request: NextRequest) {
  let body: { candidates?: AlertCandidate[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const candidates = Array.isArray(body.candidates) ? body.candidates.slice(0, 30) : [];
  if (!candidates.length) {
    const result: AlertCenterResult = { summary: 'No material anomalies were detected in the available comparison windows.', analyzedAt: new Date().toISOString(), comparison: 'Latest period vs baseline', alerts: [] };
    return NextResponse.json(result);
  }

  try {
    const ai = await callOpenAI<AIResult>(SYSTEM_PROMPT, `Triage every candidate and return one evaluation per alertId.\n\nCANDIDATES:\n${JSON.stringify(candidates, null, 2)}`, {
      temperature: 0.2,
      maxOutputTokens: 6000,
      schema: { name: 'meta_ads_alert_triage', value: ALERT_SCHEMA },
    });
    const evaluations = new Map(ai.evaluations.map(item => [item.alertId, item]));
    const alerts: AIAlert[] = candidates.map(candidate => {
      const evaluation = evaluations.get(candidate.id);
      return {
        ...candidate,
        title: evaluation?.title ?? candidate.type.replaceAll('_', ' '),
        explanation: evaluation?.explanation ?? candidate.evidence,
        recommendedAction: evaluation?.recommendedAction ?? 'Review the supporting metrics before changing delivery.',
        confidence: evaluation?.confidence ?? 70,
      };
    });
    const result: AlertCenterResult = {
      summary: ai.summary,
      analyzedAt: new Date().toISOString(),
      comparison: 'Today vs prior 7-day average; latest 7 days vs preceding 7 days; and same-objective peer comparison',
      alerts,
    };
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof OpenAIError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: 'Alert analysis failed.' }, { status: 500 });
  }
}

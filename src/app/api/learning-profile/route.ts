import { NextRequest, NextResponse } from 'next/server';
import { callOpenAI, OpenAIError } from '@/lib/openai';
import type { AccountLearningProfile, LearningRecord } from '@/lib/types/ai-learning';

const SYSTEM_PROMPT = `Build an account learning profile from recommendation history and measured outcomes. Use only the supplied evidence. Do not treat correlation as causation. Do not invent audience or creative patterns without supporting records. Respond in concise English with practical guidance for future optimization.`;
const SCHEMA: Record<string, unknown> = { type: 'object', additionalProperties: false, properties: {
  summary: { type: 'string' }, confidence: { type: 'integer', minimum: 0, maximum: 100 },
  successfulActionTypes: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { actionType: { type: 'string' }, successRate: { type: 'number', minimum: 0, maximum: 100 }, sampleSize: { type: 'integer' }, learning: { type: 'string' } }, required: ['actionType', 'successRate', 'sampleSize', 'learning'] } },
  ineffectiveActionTypes: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { actionType: { type: 'string' }, sampleSize: { type: 'integer' }, learning: { type: 'string' } }, required: ['actionType', 'sampleSize', 'learning'] } },
  kpiBenchmarks: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { objectiveFamily: { type: 'string' }, metric: { type: 'string' }, medianValue: { type: 'number' }, sampleSize: { type: 'integer' }, interpretation: { type: 'string' } }, required: ['objectiveFamily', 'metric', 'medianValue', 'sampleSize', 'interpretation'] } },
  audienceLearnings: { type: 'array', items: { type: 'string' } }, creativeLearnings: { type: 'array', items: { type: 'string' } }, nextRules: { type: 'array', items: { type: 'string' } }, caveats: { type: 'array', items: { type: 'string' } },
}, required: ['summary', 'confidence', 'successfulActionTypes', 'ineffectiveActionTypes', 'kpiBenchmarks', 'audienceLearnings', 'creativeLearnings', 'nextRules', 'caveats'] };

function median(values: number[]) { const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; }

export async function POST(request: NextRequest) {
  let payload: { accountId: string; records: LearningRecord[] };
  try { payload = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const records = (payload.records ?? []).slice(-100);
  if (!payload.accountId || !records.length) return NextResponse.json({ error: 'No action history is available yet.' }, { status: 400 });
  const accepted = records.filter(item => item.accepted);
  const successfulBudgetChanges = accepted.filter(item => ['adjust_daily_budget', 'update_campaign_budget'].includes(item.actionType) && item.checkpoints.some(check => check.verdict === 'improved')).map(item => Math.abs(item.changePercent)).filter(value => value > 0);
  const safeBudgetChangePercent = successfulBudgetChanges.length ? median(successfulBudgetChanges) : null;
  const evaluatedRecords = accepted.flatMap(record => {
    const latest = [...record.checkpoints].sort((a, b) => b.days - a.days)[0];
    return latest ? [{ record, checkpoint: latest }] : [];
  });
  const actionStats = new Map<string, { total: number; improved: number }>();
  const benchmarkValues = new Map<string, { objectiveFamily: string; metric: string; values: number[] }>();
  for (const { record, checkpoint } of evaluatedRecords) {
    const stat = actionStats.get(record.actionType) ?? { total: 0, improved: 0 };
    stat.total += 1; if (checkpoint.verdict === 'improved') stat.improved += 1; actionStats.set(record.actionType, stat);
    const value = checkpoint.after.objectiveKpis.primary.value;
    if (value != null) {
      const key = `${record.objectiveFamily}:${checkpoint.primaryMetric}`;
      const group = benchmarkValues.get(key) ?? { objectiveFamily: record.objectiveFamily, metric: checkpoint.primaryMetric, values: [] };
      group.values.push(value); benchmarkValues.set(key, group);
    }
  }
  try {
    const ai = await callOpenAI<Omit<AccountLearningProfile, 'accountId' | 'generatedAt' | 'sampleSize' | 'acceptanceRate' | 'safeBudgetChangePercent'>>(SYSTEM_PROMPT, `RECORDS:\n${JSON.stringify(records, null, 2)}\nOnly checkpoints with verdict=improved count as positive evidence. Reduce confidence when the sample is small.`, { temperature: 0.15, maxOutputTokens: 4500, schema: { name: 'account_learning_profile', value: SCHEMA } });
    const successfulActionTypes = Array.from(actionStats.entries()).map(([actionType, stat]) => ({
      actionType, successRate: stat.total ? stat.improved / stat.total * 100 : 0, sampleSize: stat.total,
      learning: ai.successfulActionTypes.find(item => item.actionType === actionType)?.learning ?? `${stat.improved}/${stat.total} evaluations with improved outcomes.`,
    })).filter(item => item.successRate >= 50);
    const ineffectiveActionTypes = Array.from(actionStats.entries()).filter(([, stat]) => stat.total > 0 && stat.improved / stat.total < 0.5).map(([actionType, stat]) => ({
      actionType, sampleSize: stat.total, learning: ai.ineffectiveActionTypes.find(item => item.actionType === actionType)?.learning ?? `No consistent improvement observed across ${stat.total} evaluations.`,
    }));
    const kpiBenchmarks = Array.from(benchmarkValues.values()).map(group => ({
      objectiveFamily: group.objectiveFamily, metric: group.metric, medianValue: median(group.values), sampleSize: group.values.length,
      interpretation: ai.kpiBenchmarks.find(item => item.objectiveFamily === group.objectiveFamily && item.metric === group.metric)?.interpretation ?? 'Observed median KPI after changes.',
    }));
    const profile: AccountLearningProfile = {
      accountId: payload.accountId, generatedAt: new Date().toISOString(), sampleSize: records.length,
      acceptanceRate: records.length ? accepted.length / records.length * 100 : 0, safeBudgetChangePercent,
      ...ai, confidence: Math.min(ai.confidence, evaluatedRecords.length ? Math.min(90, 20 + evaluatedRecords.length * 10) : 15),
      successfulActionTypes, ineffectiveActionTypes, kpiBenchmarks,
      audienceLearnings: accepted.some(item => item.actionType === 'expand_audience') ? ai.audienceLearnings : [],
      creativeLearnings: accepted.some(item => item.actionType === 'replace_creative') ? ai.creativeLearnings : [],
    };
    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof OpenAIError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to summarize learning.' }, { status: 500 });
  }
}

import { graphFetch } from './client';
import { deriveCampaignKpis } from '@/lib/campaign-kpis';
import type { InsightsData } from '@/lib/types';
import type { AdsChatMetrics } from '@/lib/types/ads-chat';
import type { LearningCheckpoint, LearningCheckpointDay, LearningRecord, OutcomeVerdict } from '@/lib/types/ai-learning';

const FIELDS = 'spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,actions,action_values,cost_per_action_type,purchase_roas,website_purchase_roas,outbound_clicks,inline_post_engagement,cost_per_inline_post_engagement,video_thruplay_watched_actions,cost_per_thruplay';
function iso(date: Date) { return date.toISOString().slice(0, 10); }
function num(value?: string) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
export function insightToLearningMetrics(row: InsightsData | undefined, objective: string): AdsChatMetrics { return { spend: num(row?.spend), impressions: num(row?.impressions), reach: num(row?.reach), frequency: num(row?.frequency), clicks: num(row?.clicks), ctr: num(row?.ctr), cpc: num(row?.cpc), cpm: num(row?.cpm), objectiveKpis: deriveCampaignKpis(objective, row) }; }
function change(before: number | null, after: number | null) { return before != null && after != null && before !== 0 ? (after - before) / Math.abs(before) * 100 : null; }
function lowerIsBetter(key: string) { return ['cpa', 'cpl', 'cost_per_lpv', 'cost_per_engagement', 'cost_per_thruplay', 'cpc', 'cpm'].includes(key); }

async function fetchMetrics(entityId: string, objective: string, period: { since: string; until: string }, token: string) {
  const result = await graphFetch<{ data: InsightsData[] }>(`/${entityId}/insights`, { fields: FIELDS, time_range: JSON.stringify(period), time_increment: 'all_days' }, token, { cache: false });
  return insightToLearningMetrics(result.data?.[0], objective);
}

export function checkpointDue(record: LearningRecord, days: LearningCheckpointDay) {
  return record.accepted && Date.now() >= new Date(record.appliedAt).getTime() + days * 24 * 60 * 60 * 1000 && !record.checkpoints.some(item => item.days === days);
}

export async function evaluateLearningCheckpoint(record: LearningRecord, days: LearningCheckpointDay, token: string): Promise<LearningCheckpoint> {
  const applied = new Date(record.appliedAt); const afterUntil = new Date(applied); afterUntil.setUTCDate(afterUntil.getUTCDate() + days - 1);
  const beforeUntil = new Date(applied); beforeUntil.setUTCDate(beforeUntil.getUTCDate() - 1);
  const beforeSince = new Date(beforeUntil); beforeSince.setUTCDate(beforeSince.getUTCDate() - days + 1);
  const periods = { before: { since: iso(beforeSince), until: iso(beforeUntil) }, after: { since: iso(applied), until: iso(afterUntil) } };
  const [before, after] = await Promise.all([fetchMetrics(record.entityId, record.objective, periods.before, token), fetchMetrics(record.entityId, record.objective, periods.after, token)]);
  const primaryMetric = before.objectiveKpis.primary.key;
  const beforeValue = before.objectiveKpis.primary.value; const afterValue = after.objectiveKpis.primary.value;
  const rawPrimaryChange = change(beforeValue, afterValue);
  let improvementPercent = rawPrimaryChange == null ? null : lowerIsBetter(primaryMetric) ? -rawPrimaryChange : rawPrimaryChange;
  if (record.actionType === 'pause_entity') improvementPercent = change(before.spend, after.spend) == null ? null : -(change(before.spend, after.spend) as number);
  const verdict: OutcomeVerdict = improvementPercent == null ? 'insufficient_data' : improvementPercent > 5 ? 'improved' : improvementPercent < -5 ? 'worse' : 'neutral';
  const spendChangePercent = change(before.spend, after.spend);
  const explanation = record.actionType === 'pause_entity'
    ? `Spend changed ${spendChangePercent == null ? 'insufficient data' : `${spendChangePercent.toFixed(1)}%`} after pausing.`
    : `${before.objectiveKpis.primary.label} ${beforeValue == null || afterValue == null ? 'insufficient data for comparison' : `changed ${rawPrimaryChange!.toFixed(1)}%`}.`;
  return { days, evaluatedAt: new Date().toISOString(), beforePeriod: periods.before, afterPeriod: periods.after, before, after, primaryMetric, improvementPercent, spendChangePercent, verdict, explanation };
}

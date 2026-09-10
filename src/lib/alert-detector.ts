import { deriveCampaignKpis } from './campaign-kpis';
import type { Campaign, InsightActionValue, InsightsData } from './types';
import type { AdSetAlertRow, AlertCandidate, CampaignDailyAlertRow } from './types/alerts';

function sumStats(rows: InsightsData[], field: keyof InsightsData): InsightActionValue[] | undefined {
  const totals = new Map<string, number>();
  rows.forEach(row => ((row[field] as InsightActionValue[] | undefined) ?? []).forEach(item => {
    totals.set(item.action_type, (totals.get(item.action_type) ?? 0) + Number(item.value || 0));
  }));
  return totals.size ? Array.from(totals, ([action_type, value]) => ({ action_type, value: String(value) })) : undefined;
}

function aggregate(rows: InsightsData[]): InsightsData {
  const sum = (field: keyof InsightsData) => rows.reduce((total, row) => total + Number(row[field] || 0), 0);
  const impressions = sum('impressions');
  const reach = sum('reach');
  const clicks = sum('clicks');
  const spend = sum('spend');
  return {
    impressions: String(impressions), reach: String(reach), clicks: String(clicks), spend: String(spend),
    ctr: impressions > 0 ? String(clicks / impressions * 100) : undefined,
    cpc: clicks > 0 ? String(spend / clicks) : undefined,
    cpm: impressions > 0 ? String(spend / impressions * 1000) : undefined,
    frequency: reach > 0 ? String(impressions / reach) : undefined,
    actions: sumStats(rows, 'actions'), action_values: sumStats(rows, 'action_values'),
    outbound_clicks: sumStats(rows, 'outbound_clicks'),
    video_thruplay_watched_actions: sumStats(rows, 'video_thruplay_watched_actions'),
  };
}

function pct(current: number, baseline: number) {
  return baseline === 0 ? 0 : (current - baseline) / Math.abs(baseline) * 100;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function resultCount(objective: string, insight: InsightsData) {
  return deriveCampaignKpis(objective, insight).secondary.find(metric =>
    ['purchases', 'leads', 'landing_page_views', 'engagements', 'thruplays'].includes(metric.key),
  )?.value ?? null;
}

export function detectAlertCandidates(campaigns: Campaign[], dailyRows: CampaignDailyAlertRow[], adsetRows: AdSetAlertRow[]): AlertCandidate[] {
  const campaignById = new Map(campaigns.map(campaign => [campaign.id, campaign]));
  const rowsByCampaign = new Map<string, CampaignDailyAlertRow[]>();
  dailyRows.forEach(row => rowsByCampaign.set(row.campaign_id, [...(rowsByCampaign.get(row.campaign_id) ?? []), row]));
  const alerts: AlertCandidate[] = [];
  const snapshots: Array<{ campaign: Campaign; insight: InsightsData; primaryKey: string; primaryValue: number; family: string }> = [];

  const push = (candidate: Omit<AlertCandidate, 'id'>) => alerts.push({
    ...candidate,
    id: `${candidate.type}:${candidate.entityType}:${candidate.entityId}:${candidate.metric}`,
  });

  campaigns.forEach(campaign => {
    const rows = (rowsByCampaign.get(campaign.id) ?? []).sort((a, b) => (a.date_start ?? '').localeCompare(b.date_start ?? ''));
    if (!rows.length) {
      if (campaign.status === 'ACTIVE') push({
        type: 'no_delivery', severity: 'critical', entityType: 'campaign', entityId: campaign.id, entityName: campaign.name,
        campaignId: campaign.id, objective: campaign.objective, metric: 'spend', currentValue: 0, baselineValue: 0,
        changePercent: 0, evidence: 'Active campaign returned no insight rows in the last 15 days.', comparison: 'Last 15 days',
      });
      return;
    }

    const window = Math.min(7, Math.floor(rows.length / 2));
    if (window < 2) return;
    const currentRows = rows.slice(-window);
    const previousRows = rows.slice(-(window * 2), -window);
    const current = aggregate(currentRows);
    const previous = aggregate(previousRows);
    const currentSpend = Number(current.spend || 0);
    const previousSpend = Number(previous.spend || 0);
    const currentKpis = deriveCampaignKpis(campaign.objective, current);
    const previousKpis = deriveCampaignKpis(campaign.objective, previous);
    const comparison = `Latest ${window} days vs preceding ${window} days`;

    if (campaign.status === 'ACTIVE' && currentSpend === 0) push({
      type: 'no_delivery', severity: 'critical', entityType: 'campaign', entityId: campaign.id, entityName: campaign.name,
      campaignId: campaign.id, objective: campaign.objective, metric: 'spend', currentValue: 0, baselineValue: previousSpend,
      changePercent: previousSpend > 0 ? -100 : 0, evidence: `Campaign is active but spent 0 during the latest ${window}-day window.`, comparison,
    });

    const latestSpend = Number(rows[rows.length - 1].spend || 0);
    const priorDaily = rows.slice(Math.max(0, rows.length - 8), -1).map(row => Number(row.spend || 0));
    const averageDaily = priorDaily.length ? priorDaily.reduce((sum, value) => sum + value, 0) / priorDaily.length : 0;
    if (averageDaily > 0 && latestSpend > averageDaily * 1.8) push({
      type: 'spend_spike', severity: latestSpend > averageDaily * 3 ? 'critical' : 'warning', entityType: 'campaign', entityId: campaign.id,
      entityName: campaign.name, campaignId: campaign.id, objective: campaign.objective, metric: 'daily_spend', currentValue: latestSpend,
      baselineValue: averageDaily, changePercent: pct(latestSpend, averageDaily), evidence: `Latest daily spend is ${pct(latestSpend, averageDaily).toFixed(1)}% above the prior 7-day daily average.`, comparison: 'Latest day vs prior 7-day average',
    });

    const currentPrimary = currentKpis.primary.value;
    const previousPrimary = previousKpis.primary.value;
    if (currentPrimary != null && previousPrimary != null) {
      snapshots.push({ campaign, insight: current, primaryKey: currentKpis.primary.key, primaryValue: currentPrimary, family: currentKpis.objectiveFamily });
      const movement = pct(currentPrimary, previousPrimary);
      const isRoas = currentKpis.primary.key === 'roas';
      const worsened = isRoas ? movement <= -25 : movement >= 30;
      if (worsened) push({
        type: isRoas ? 'roas_drop' : 'cost_increase', severity: Math.abs(movement) >= 50 ? 'critical' : 'warning', entityType: 'campaign',
        entityId: campaign.id, entityName: campaign.name, campaignId: campaign.id, objective: campaign.objective,
        metric: currentKpis.primary.key, currentValue: currentPrimary, baselineValue: previousPrimary, changePercent: movement,
        evidence: `${currentKpis.primary.label} moved from ${previousPrimary.toFixed(2)} to ${currentPrimary.toFixed(2)}.`, comparison,
      });
    }

    const currentCtr = Number(current.ctr || 0);
    const previousCtr = Number(previous.ctr || 0);
    if (previousCtr > 0 && pct(currentCtr, previousCtr) <= -25 && currentSpend > 0) push({
      type: 'ctr_decline', severity: 'warning', entityType: 'campaign', entityId: campaign.id, entityName: campaign.name,
      campaignId: campaign.id, objective: campaign.objective, metric: 'ctr', currentValue: currentCtr, baselineValue: previousCtr,
      changePercent: pct(currentCtr, previousCtr), evidence: `CTR declined from ${previousCtr.toFixed(2)}% to ${currentCtr.toFixed(2)}%.`, comparison,
    });

    const currentResults = resultCount(campaign.objective, current);
    const previousResults = resultCount(campaign.objective, previous);
    const currentFrequency = Number(current.frequency || 0);
    const previousFrequency = Number(previous.frequency || 0);
    if (previousFrequency > 0 && currentFrequency > previousFrequency * 1.15 && previousResults != null && currentResults != null && currentResults < previousResults * .8) push({
      type: 'frequency_fatigue', severity: 'warning', entityType: 'campaign', entityId: campaign.id, entityName: campaign.name,
      campaignId: campaign.id, objective: campaign.objective, metric: 'frequency', currentValue: currentFrequency, baselineValue: previousFrequency,
      changePercent: pct(currentFrequency, previousFrequency), evidence: `Frequency rose while objective results fell from ${previousResults} to ${currentResults}; this is a fatigue signal, not proof.`, comparison,
    });

    const currentClicks = Number(current.clicks || 0);
    const previousClicks = Number(previous.clicks || 0);
    if (previousResults != null && previousResults >= 3 && currentResults === 0 && currentClicks >= previousClicks * .7 && currentSpend > 0) push({
      type: 'tracking_loss', severity: 'critical', entityType: 'campaign', entityId: campaign.id, entityName: campaign.name,
      campaignId: campaign.id, objective: campaign.objective, metric: 'objective_results', currentValue: 0, baselineValue: previousResults,
      changePercent: -100, evidence: `Objective results fell to zero while clicks remained at ${currentClicks}; verify tracking before changing delivery.`, comparison,
    });
  });

  snapshots.forEach(snapshot => {
    const peers = snapshots.filter(item => item.family === snapshot.family && item.primaryKey === snapshot.primaryKey).map(item => item.primaryValue);
    if (peers.length < 3) return;
    const benchmark = median(peers);
    const lowerIsBetter = snapshot.primaryKey !== 'roas';
    const isOutlier = lowerIsBetter ? snapshot.primaryValue > benchmark * 1.5 : snapshot.primaryValue < benchmark * .67;
    if (benchmark > 0 && isOutlier) push({
      type: 'peer_outlier', severity: 'info', entityType: 'campaign', entityId: snapshot.campaign.id, entityName: snapshot.campaign.name,
      campaignId: snapshot.campaign.id, objective: snapshot.campaign.objective, metric: snapshot.primaryKey,
      currentValue: snapshot.primaryValue, baselineValue: benchmark, changePercent: pct(snapshot.primaryValue, benchmark),
      evidence: `${snapshot.primaryKey.toUpperCase()} is materially worse than the median of ${peers.length} campaigns with the same objective family.`, comparison: 'Campaign vs same-objective peers',
    });
  });

  const adsetsByCampaign = new Map<string, AdSetAlertRow[]>();
  adsetRows.forEach(row => adsetsByCampaign.set(row.campaign_id, [...(adsetsByCampaign.get(row.campaign_id) ?? []), row]));
  adsetsByCampaign.forEach((rows, campaignId) => {
    if (rows.length < 2) return;
    const total = rows.reduce((sum, row) => sum + Number(row.spend || 0), 0);
    const largest = [...rows].sort((a, b) => Number(b.spend || 0) - Number(a.spend || 0))[0];
    const share = total > 0 ? Number(largest.spend || 0) / total * 100 : 0;
    const campaign = campaignById.get(campaignId);
    if (share >= 70 && campaign) push({
      type: 'budget_concentration', severity: share >= 85 ? 'critical' : 'warning', entityType: 'adset', entityId: largest.adset_id,
      entityName: largest.adset_name, campaignId, objective: campaign.objective, metric: 'spend_share', currentValue: share,
      baselineValue: 100 / rows.length, changePercent: pct(share, 100 / rows.length), evidence: `${largest.adset_name} consumed ${share.toFixed(1)}% of campaign spend across ${rows.length} ad sets.`, comparison: 'Latest 7-day ad set spend share',
    });
  });

  const severityRank = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]).slice(0, 30);
}

import { graphFetchAll } from './client';
import { getCampaigns } from './campaigns';
import { deriveCampaignKpis } from '@/lib/campaign-kpis';
import { rawBudgetToAmount } from '@/lib/utils';
import type { CampaignInsight, InsightsData } from '@/lib/types';
import type { AdsChatEntity, AdsChatMetrics, AdsChatSnapshot } from '@/lib/types/ads-chat';

interface InsightRow extends InsightsData {
  campaign_id: string; campaign_name?: string;
  adset_id?: string; adset_name?: string;
  ad_id?: string; ad_name?: string;
}

interface AdSetDefinition { id: string; status?: string; daily_budget?: string; lifetime_budget?: string; }
interface AdDefinition { id: string; status?: string; effective_status?: string; }

const METRIC_FIELDS = 'spend,impressions,reach,frequency,clicks,ctr,cpc,cpm,actions,action_values,cost_per_action_type,purchase_roas,website_purchase_roas,outbound_clicks,inline_post_engagement,cost_per_inline_post_engagement,video_thruplay_watched_actions,cost_per_thruplay';

function iso(date: Date) { return date.toISOString().slice(0, 10); }
function range(days: number) {
  const until = new Date();
  const since = new Date(until); since.setUTCDate(since.getUTCDate() - days + 1);
  const previousUntil = new Date(since); previousUntil.setUTCDate(previousUntil.getUTCDate() - 1);
  const previousSince = new Date(previousUntil); previousSince.setUTCDate(previousSince.getUTCDate() - days + 1);
  return { current: { since: iso(since), until: iso(until) }, previous: { since: iso(previousSince), until: iso(previousUntil) } };
}

async function getLevelInsights(accountId: string, level: 'campaign' | 'adset' | 'ad', timeRange: { since: string; until: string }, token: string) {
  const identityFields = level === 'campaign'
    ? 'campaign_id,campaign_name'
    : level === 'adset'
      ? 'campaign_id,campaign_name,adset_id,adset_name'
      : 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name';
  const result = await graphFetchAll<InsightRow>(`/${accountId}/insights`, {
    level, fields: `${identityFields},${METRIC_FIELDS}`, time_range: JSON.stringify(timeRange), limit: '200',
  }, token, { cache: false });
  return result;
}

async function safeLevelInsights(accountId: string, level: 'campaign' | 'adset' | 'ad', timeRange: { since: string; until: string }, token: string) {
  try { return { rows: await getLevelInsights(accountId, level, timeRange, token), error: null as string | null }; }
  catch (error) { return { rows: [] as InsightRow[], error: error instanceof Error ? error.message : `Unable to load ${level} insights.` }; }
}

async function safeDefinitions<T>(accountId: string, connection: 'adsets' | 'ads', fields: string, token: string) {
  try {
    const result = await graphFetchAll<T>(`/${accountId}/${connection}`, { fields, limit: '200' }, token, { cache: false });
    return { rows: result, error: null as string | null };
  } catch (error) { return { rows: [] as T[], error: error instanceof Error ? error.message : `Unable to load ${connection}.` }; }
}

function num(value?: string) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function metrics(row: InsightRow | CampaignInsight | undefined, objective: string): AdsChatMetrics {
  return { spend: num(row?.spend), impressions: num(row?.impressions), reach: num(row?.reach), frequency: num(row?.frequency), clicks: num(row?.clicks), ctr: num(row?.ctr), cpc: num(row?.cpc), cpm: num(row?.cpm), objectiveKpis: deriveCampaignKpis(objective, row) };
}
function topBySpend(items: AdsChatEntity[], limit: number) { return items.sort((a, b) => Math.max(b.current.spend ?? 0, b.previous.spend ?? 0) - Math.max(a.current.spend ?? 0, a.previous.spend ?? 0)).slice(0, limit); }

export async function getAdsChatSnapshot(accountId: string, accountName: string, currency: string, days: number, token: string): Promise<AdsChatSnapshot> {
  const periods = range(days);
  const [{ campaigns, insights: embeddedCampaignMap }, currentCampaignResult, previousCampaignResult, currentAdsetResult, previousAdsetResult, currentAdResult, previousAdResult, adsetDefinitions, adDefinitions] = await Promise.all([
    getCampaigns(accountId, token, periods.current),
    safeLevelInsights(accountId, 'campaign', periods.current, token),
    safeLevelInsights(accountId, 'campaign', periods.previous, token),
    safeLevelInsights(accountId, 'adset', periods.current, token),
    safeLevelInsights(accountId, 'adset', periods.previous, token),
    safeLevelInsights(accountId, 'ad', periods.current, token),
    safeLevelInsights(accountId, 'ad', periods.previous, token),
    safeDefinitions<AdSetDefinition>(accountId, 'adsets', 'id,status,daily_budget,lifetime_budget', token),
    safeDefinitions<AdDefinition>(accountId, 'ads', 'id,status,effective_status', token),
  ]);
  const currentCampaignMap = currentCampaignResult.rows.length
    ? Object.fromEntries(currentCampaignResult.rows.map(row => [row.campaign_id, row]))
    : embeddedCampaignMap;
  const campaignById = new Map(campaigns.map(item => [item.id, item]));
  const previousCampaignMap = new Map(previousCampaignResult.rows.map(item => [item.campaign_id, item]));
  const adsetDefinitionMap = new Map(adsetDefinitions.rows.map(item => [item.id, item]));
  const adDefinitionMap = new Map(adDefinitions.rows.map(item => [item.id, item]));
  const campaignEntities: AdsChatEntity[] = campaigns.map(campaign => ({
    entityType: 'campaign', id: campaign.id, name: campaign.name, campaignId: campaign.id, campaignName: campaign.name,
    href: `/accounts/${accountId}/campaigns/${campaign.id}`, status: campaign.status, objective: campaign.objective,
    dailyBudget: campaign.daily_budget ? rawBudgetToAmount(campaign.daily_budget, currency) : undefined,
    lifetimeBudget: campaign.lifetime_budget ? rawBudgetToAmount(campaign.lifetime_budget, currency) : undefined,
    current: metrics(currentCampaignMap[campaign.id], campaign.objective), previous: metrics(previousCampaignMap.get(campaign.id), campaign.objective),
  }));

  const mergeRows = (current: InsightRow[], previous: InsightRow[], level: 'adset' | 'ad') => {
    const key = (row: InsightRow) => level === 'adset' ? row.adset_id : row.ad_id;
    const currentMap = new Map(current.filter(row => key(row)).map(row => [key(row)!, row]));
    const previousMap = new Map(previous.filter(row => key(row)).map(row => [key(row)!, row]));
    return Array.from(new Set([...Array.from(currentMap.keys()), ...Array.from(previousMap.keys())])).map(id => {
      const now = currentMap.get(id); const before = previousMap.get(id); const row = now ?? before!;
      const campaign = campaignById.get(row.campaign_id); const objective = campaign?.objective ?? 'UNKNOWN';
      const adsetId = row.adset_id ?? '';
      const definition = level === 'adset' ? adsetDefinitionMap.get(id) : adDefinitionMap.get(id);
      return {
        entityType: level, id, name: level === 'adset' ? row.adset_name ?? id : row.ad_name ?? id,
        campaignId: row.campaign_id, campaignName: campaign?.name ?? row.campaign_name ?? row.campaign_id,
        ...(level === 'ad' ? { adsetId, adsetName: row.adset_name } : {}), objective,
        status: definition?.status,
        ...(level === 'adset' && definition && 'daily_budget' in definition ? {
          dailyBudget: definition.daily_budget ? rawBudgetToAmount(definition.daily_budget, currency) : undefined,
          lifetimeBudget: definition.lifetime_budget ? rawBudgetToAmount(definition.lifetime_budget, currency) : undefined,
        } : {}),
        href: level === 'adset' ? `/accounts/${accountId}/campaigns/${row.campaign_id}/adsets/${id}` : `/accounts/${accountId}/campaigns/${row.campaign_id}/adsets/${adsetId}?adId=${id}`,
        current: metrics(now, objective), previous: metrics(before, objective),
      } satisfies AdsChatEntity;
    });
  };
  const adsetEntities = topBySpend(mergeRows(currentAdsetResult.rows, previousAdsetResult.rows, 'adset'), 40);
  const adEntities = topBySpend(mergeRows(currentAdResult.rows, previousAdResult.rows, 'ad'), 40);
  const unavailable = [
    ['current-period campaigns', currentCampaignResult.error], ['previous-period campaigns', previousCampaignResult.error],
    ['current-period ad sets', currentAdsetResult.error], ['previous-period ad sets', previousAdsetResult.error],
    ['current-period ads', currentAdResult.error], ['previous-period ads', previousAdResult.error],
    ['ad set status', adsetDefinitions.error], ['ad status', adDefinitions.error],
  ].filter((item): item is [string, string] => Boolean(item[1])).map(([label, error]) => `Failed to load ${label}: ${error}`);
  return {
    accountId, accountName, currency, collectedAt: new Date().toISOString(), period: { days, ...periods },
    campaigns: topBySpend(campaignEntities, 50), adsets: adsetEntities, ads: adEntities,
    coverage: { campaignCount: Math.min(campaignEntities.length, 50), adsetCount: adsetEntities.length, adCount: adEntities.length, notes: [`Loaded ${campaigns.length} campaigns; this AI snapshot includes up to 50 campaigns and 40 ad sets and ads each, ranked by spend across the two periods. Conclusions apply only to included entities.`, 'Ad links open and highlight the relevant ad inside its ad set.', ...unavailable] },
  };
}

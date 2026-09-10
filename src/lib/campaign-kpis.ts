import type { CampaignInsight, InsightActionValue, InsightsData } from './types';

export type ObjectiveFamily = 'sales' | 'leads' | 'traffic' | 'engagement' | 'video' | 'awareness' | 'other';
export type KpiUnit = 'currency' | 'number' | 'percent' | 'ratio';

export interface DerivedKpiMetric {
  key: string;
  label: string;
  value: number | null;
  unit: KpiUnit;
}

export interface CampaignKpiSummary {
  objectiveFamily: ObjectiveFamily;
  primary: DerivedKpiMetric;
  secondary: DerivedKpiMetric[];
}

type InsightLike = CampaignInsight | InsightsData | undefined;

const PURCHASE_ACTIONS = ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'];
const LEAD_ACTIONS = ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead'];
const LPV_ACTIONS = ['landing_page_view'];
const LINK_CLICK_ACTIONS = ['link_click', 'outbound_click'];
const ENGAGEMENT_ACTIONS = ['post_engagement', 'page_engagement'];
const THRUPLAY_ACTIONS = ['video_view', 'video_30_sec_watched_actions'];

function number(value?: string): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstAction(stats: InsightActionValue[] | undefined, aliases: string[]): number | null {
  for (const alias of aliases) {
    const exact = stats?.find(item => item.action_type === alias);
    const value = number(exact?.value);
    if (value != null) return value;
  }
  return null;
}

function cost(spend: number | null, results: number | null, supplied: number | null): number | null {
  if (supplied != null) return supplied;
  return spend != null && results != null && results > 0 ? spend / results : null;
}

export function getObjectiveFamily(objective?: string): ObjectiveFamily {
  const value = (objective ?? '').toUpperCase();
  if (/SALES|CONVERSION|CATALOG|APP_PROMOTION/.test(value)) return 'sales';
  if (/LEAD/.test(value)) return 'leads';
  if (/TRAFFIC|LINK_CLICK/.test(value)) return 'traffic';
  if (/VIDEO_VIEW/.test(value)) return 'video';
  if (/ENGAGEMENT|MESSAGES|PAGE_LIKE|EVENT_RESPONSES/.test(value)) return 'engagement';
  if (/AWARENESS|REACH|BRAND/.test(value)) return 'awareness';
  return 'other';
}

export function deriveCampaignKpis(objective: string | undefined, insight: InsightLike): CampaignKpiSummary {
  const objectiveFamily = getObjectiveFamily(objective);
  const spend = number(insight?.spend);
  const purchases = firstAction(insight?.actions, PURCHASE_ACTIONS);
  const purchaseValue = firstAction(insight?.action_values, PURCHASE_ACTIONS);
  const purchaseRoas = firstAction(insight?.purchase_roas, PURCHASE_ACTIONS)
    ?? firstAction(insight?.website_purchase_roas, PURCHASE_ACTIONS)
    ?? (purchaseValue != null && spend != null && spend > 0 ? purchaseValue / spend : null);
  const cpa = cost(spend, purchases, firstAction(insight?.cost_per_action_type, PURCHASE_ACTIONS));
  const leads = firstAction(insight?.actions, LEAD_ACTIONS);
  const cpl = cost(spend, leads, firstAction(insight?.cost_per_action_type, LEAD_ACTIONS));
  const landingPageViews = firstAction(insight?.actions, LPV_ACTIONS);
  const costPerLpv = cost(spend, landingPageViews, firstAction(insight?.cost_per_action_type, LPV_ACTIONS));
  const linkClicks = firstAction(insight?.actions, LINK_CLICK_ACTIONS)
    ?? firstAction(insight?.outbound_clicks, ['outbound_click']);
  const engagement = number(insight?.inline_post_engagement)
    ?? firstAction(insight?.actions, ENGAGEMENT_ACTIONS);
  const costPerEngagement = number(insight?.cost_per_inline_post_engagement)
    ?? cost(spend, engagement, firstAction(insight?.cost_per_action_type, ENGAGEMENT_ACTIONS));
  const thruplays = firstAction(insight?.video_thruplay_watched_actions, ['video_view'])
    ?? firstAction(insight?.actions, THRUPLAY_ACTIONS);
  const costPerThruplay = firstAction(insight?.cost_per_thruplay, ['video_view'])
    ?? cost(spend, thruplays, null);
  const reach = number(insight?.reach);
  const cpm = number(insight?.cpm);
  const frequency = number(insight?.frequency);

  const metric = (key: string, label: string, value: number | null, unit: KpiUnit): DerivedKpiMetric => ({ key, label, value, unit });

  if (objectiveFamily === 'sales') return {
    objectiveFamily,
    primary: metric('roas', 'ROAS', purchaseRoas, 'ratio'),
    secondary: [metric('purchases', 'Purchases', purchases, 'number'), metric('cpa', 'CPA', cpa, 'currency'), metric('conversion_value', 'Conversion value', purchaseValue, 'currency')],
  };
  if (objectiveFamily === 'leads') return {
    objectiveFamily,
    primary: metric('cpl', 'CPL', cpl, 'currency'),
    secondary: [metric('leads', 'Leads', leads, 'number')],
  };
  if (objectiveFamily === 'traffic') return {
    objectiveFamily,
    primary: metric('cost_per_lpv', 'Cost / LPV', costPerLpv, 'currency'),
    secondary: [metric('landing_page_views', 'Landing page views', landingPageViews, 'number'), metric('link_clicks', 'Link clicks', linkClicks, 'number')],
  };
  if (objectiveFamily === 'engagement') return {
    objectiveFamily,
    primary: metric('cost_per_engagement', 'Cost / engagement', costPerEngagement, 'currency'),
    secondary: [metric('engagements', 'Engagements', engagement, 'number')],
  };
  if (objectiveFamily === 'video') return {
    objectiveFamily,
    primary: metric('cost_per_thruplay', 'Cost / ThruPlay', costPerThruplay, 'currency'),
    secondary: [metric('thruplays', 'ThruPlays', thruplays, 'number')],
  };
  if (objectiveFamily === 'awareness') return {
    objectiveFamily,
    primary: metric('cpm', 'CPM', cpm, 'currency'),
    secondary: [metric('reach', 'Reach', reach, 'number'), metric('frequency', 'Frequency', frequency, 'number')],
  };

  return {
    objectiveFamily,
    primary: metric('ctr', 'CTR', number(insight?.ctr), 'percent'),
    secondary: [metric('cpc', 'CPC', number(insight?.cpc), 'currency'), metric('cpm', 'CPM', cpm, 'currency')],
  };
}

export function formatKpi(metric: DerivedKpiMetric, currency: string): string {
  if (metric.value == null) return '—';
  if (metric.unit === 'currency') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(metric.value);
  }
  if (metric.unit === 'ratio') return `${metric.value.toFixed(2)}x`;
  if (metric.unit === 'percent') return `${metric.value.toFixed(2)}%`;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(metric.value);
}

export const META_CONVERSION_INSIGHT_FIELDS = [
  'actions',
  'action_values',
  'cost_per_action_type',
  'purchase_roas',
  'website_purchase_roas',
  'outbound_clicks',
  'inline_post_engagement',
  'cost_per_inline_post_engagement',
  'video_thruplay_watched_actions',
  'cost_per_thruplay',
].join(',');

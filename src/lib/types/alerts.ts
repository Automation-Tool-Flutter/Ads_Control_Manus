import type { InsightsData } from '../types';

export interface CampaignDailyAlertRow extends InsightsData {
  campaign_id: string;
  campaign_name: string;
}

export interface AdSetAlertRow extends InsightsData {
  campaign_id: string;
  campaign_name: string;
  adset_id: string;
  adset_name: string;
}

export type AlertType = 'spend_spike' | 'no_delivery' | 'cost_increase' | 'roas_drop' | 'ctr_decline' | 'frequency_fatigue' | 'budget_concentration' | 'tracking_loss' | 'peer_outlier';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertEntityType = 'campaign' | 'adset';

export interface AlertCandidate {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  entityType: AlertEntityType;
  entityId: string;
  entityName: string;
  campaignId: string;
  objective: string;
  metric: string;
  currentValue: number;
  baselineValue: number;
  changePercent: number;
  evidence: string;
  comparison: string;
}

export interface AIAlert extends AlertCandidate {
  title: string;
  explanation: string;
  recommendedAction: string;
  confidence: number;
}

export interface AlertCenterResult {
  summary: string;
  analyzedAt: string;
  comparison: string;
  alerts: AIAlert[];
}

export type AlertCenterState =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; result: AlertCenterResult }
  | { status: 'error'; error: string };

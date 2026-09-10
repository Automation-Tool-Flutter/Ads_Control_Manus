import type { AdSet, AdSetInsight, CampaignDetail, InsightsData } from '../types';

export type RootCauseSeverity = 'critical' | 'warning' | 'opportunity' | 'stable';
export type RootCauseEntityType = 'campaign' | 'adset' | 'ad' | 'none';

export interface RootCauseLeaf {
  id: string;
  label: string;
  evidence: string;
  confidence: number;
  nextCheck: string;
  entityType: RootCauseEntityType;
  entityId: string;
}

export interface RootCauseDriver {
  id: string;
  label: string;
  metric: string;
  currentValue: string;
  previousValue: string;
  changePercent: number;
  evidence: string;
  confidence: number;
  nextCheck: string;
  entityType: RootCauseEntityType;
  entityId: string;
  causes: RootCauseLeaf[];
}

export interface RootCauseAnalysis {
  headline: string;
  summary: string;
  severity: RootCauseSeverity;
  confidence: number;
  comparisonLabel: string;
  primaryMetric: {
    label: string;
    currentValue: string;
    previousValue: string;
    changePercent: number;
  };
  drivers: RootCauseDriver[];
}

export interface RootCausePayload {
  campaign: CampaignDetail;
  dailyInsights: InsightsData[];
  adsets: Array<{ adset: AdSet; insight?: AdSetInsight }>;
  currency: string;
  dateFilter: string;
}

export type RootCauseState =
  | { status: 'idle' }
  | { status: 'analyzing' }
  | { status: 'success'; analysis: RootCauseAnalysis }
  | { status: 'error'; error: string };

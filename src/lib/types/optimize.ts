import type { InsightsData, AccountDetail, DatePreset } from '../types';

// ─── Facebook Bulk Insights Rows ─────────────────────────────────────────────

export interface CampaignInsightsRow extends InsightsData {
  campaign_id: string;
  campaign_name: string;
}

export interface AdSetInsightsRow extends InsightsData {
  adset_id: string;
  adset_name: string;
}

export interface AdInsightsRow extends InsightsData {
  ad_id: string;
  ad_name: string;
}

export interface AdSetTargetingRow {
  id: string;
  name: string;
  optimization_goal?: string;
  bid_strategy?: string;
  targeting?: {
    age_min?: number;
    age_max?: number;
    genders?: number[];
    geo_locations?: {
      countries?: string[];
      cities?: { name: string }[];
      regions?: { name: string }[];
    };
    interests?: { id: string; name: string }[];
    behaviors?: { id: string; name: string }[];
    custom_audiences?: { id: string; name: string }[];
    lookalike_audiences?: { id: string; name: string }[];
  };
}

// ─── Payload gửi Gemini ──────────────────────────────────────────────────────

export interface OptimizePayload {
  account: AccountDetail;
  /** account.amount_spent là cents (÷100); insights spend là currency units trực tiếp */
  accountInsights: InsightsData;
  campaignInsights: CampaignInsightsRow[];  // top 20 by spend
  adsetInsights: AdSetInsightsRow[];         // top 30 by spend
  adInsights: AdInsightsRow[];              // top 20 by spend
  adsetTargeting: AdSetTargetingRow[];
  datePreset: DatePreset;
  collectedAt: string;
}

// ─── Gemini Response Schema ───────────────────────────────────────────────────

export type Priority = 'high' | 'medium' | 'low';
export type AngleLevel = 'account' | 'campaign' | 'adset' | 'ad' | 'audience';

export interface Recommendation {
  title: string;
  description: string;
  priority: Priority;
  metric?: string;
}

export interface AngleResult {
  name: string;
  level: AngleLevel;
  score: number;
  strengths: string[];
  issues: string[];
  recommendations: Recommendation[];
}

export interface GeminiAnalysis {
  summary: string;
  overallScore: number;
  angles: AngleResult[];
}

// ─── Hook State ───────────────────────────────────────────────────────────────

export type OptimizeStep = 'idle' | 'collecting' | 'building' | 'analyzing' | 'done' | 'error';

export interface OptimizeState {
  step: OptimizeStep;
  analysis: GeminiAnalysis | null;
  error: string | null;
}

export interface OptimizeCacheEntry {
  timestamp: number;
  datePreset: DatePreset;
  analysis: GeminiAnalysis;
}

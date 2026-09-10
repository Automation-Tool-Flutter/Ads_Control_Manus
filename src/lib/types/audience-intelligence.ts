import type { InsightsData, Targeting } from '../types';

export interface AudienceAdSet {
  id: string;
  name: string;
  status: string;
  campaign?: { id: string; name: string; objective?: string };
  optimization_goal?: string;
  targeting?: Targeting & {
    interests?: Array<{ id: string; name: string }>;
    behaviors?: Array<{ id: string; name: string }>;
    custom_audiences?: Array<{ id: string; name?: string }>;
    excluded_custom_audiences?: Array<{ id: string; name?: string }>;
    lookalike_audiences?: Array<{ id: string; name?: string }>;
    publisher_platforms?: string[];
    facebook_positions?: string[];
    instagram_positions?: string[];
  };
  insights?: { data: InsightsData[] };
}

export interface AudienceBreakdownRow extends InsightsData {
  campaign_id?: string;
  campaign_name?: string;
  adset_id: string;
  adset_name: string;
  age?: string;
  gender?: string;
  region?: string;
  publisher_platform?: string;
  platform_position?: string;
}

export interface AudienceData {
  adsets: AudienceAdSet[];
  ageGender: AudienceBreakdownRow[];
  regions: AudienceBreakdownRow[];
  placements: AudienceBreakdownRow[];
  unavailableBreakdowns: string[];
}

export interface AudienceIntelligence {
  summary: string;
  confidence: number;
  topSegments: Array<{ dimension: 'age_gender' | 'region' | 'placement'; label: string; score: number; primaryKpi: string; value: string; benchmark: string; differencePercent: number; finding: string; recommendation: string }>;
  overlapRisks: Array<{ adsetAId: string; adsetAName: string; adsetBId: string; adsetBName: string; sharedSignals: string[]; risk: 'high' | 'medium' | 'low'; recommendation: string }>;
  saturationSignals: Array<{ adsetId: string; adsetName: string; status: 'healthy' | 'watch' | 'saturated' | 'insufficient_data'; evidence: string; recommendation: string }>;
  recommendations: Array<{ type: 'broad' | 'interest' | 'custom' | 'lookalike' | 'exclusion' | 'placement'; title: string; rationale: string; steps: string[]; adsetId: string; confidence: number }>;
  audienceBrief: { targetProfile: string; ageGender: string; geography: string; placements: string; expansion: string; exclusions: string; creativeMatch: string; measurementPlan: string[] };
}

export type AudienceIntelligenceState =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; analysis: AudienceIntelligence; unavailableBreakdowns: string[] }
  | { status: 'error'; error: string };

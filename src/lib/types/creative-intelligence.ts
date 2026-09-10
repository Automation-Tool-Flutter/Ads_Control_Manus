import type { Ad, InsightsData, PagePost } from '../types';

export interface CreativeAd extends Ad {
  campaign?: { id: string; name: string; objective?: string };
  adset?: { id: string; name: string };
  insights?: { data: InsightsData[] };
}

export interface CreativeAnalysisPayload {
  page: { id: string; name: string; category?: string; followersCount?: number };
  account: { id: string; name: string; currency: string };
  posts: PagePost[];
  ads: CreativeAd[];
}

export interface CreativeAnalysis {
  summary: string;
  confidence: number;
  winningPatterns: string[];
  losingPatterns: string[];
  boostCandidates: Array<{ postId: string; postLabel: string; score: number; reason: string; suggestedObjective: string }>;
  adAssessments: Array<{ adId: string; adName: string; verdict: 'winner' | 'average' | 'loser' | 'fatigue'; score: number; evidence: string; refreshRecommendation: string }>;
  variants: Array<{ basedOnId: string; headline: string; primaryText: string; cta: string; format: 'image' | 'video' | 'carousel' | 'collection' }>;
  creativeBrief: { concept: string; audience: string; hook: string; visualDirection: string; keyMessage: string; cta: string; format: string; testPlan: string[] };
}

export type CreativeIntelligenceState =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; analysis: CreativeAnalysis }
  | { status: 'error'; error: string };

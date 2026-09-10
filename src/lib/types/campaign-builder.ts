export type CampaignBusinessGoal = 'sales' | 'leads' | 'traffic' | 'engagement' | 'video' | 'awareness';

export interface CampaignBuilderInput {
  accountId: string;
  accountName: string;
  currency: string;
  productName: string;
  catalogId: string;
  catalogName: string;
  websiteUrl: string;
  businessGoal: CampaignBusinessGoal;
  totalBudget: string;
  marketCountries: string[];
  customerPersona: string;
  durationDays: number;
  kpiMetric: string;
  kpiTarget: string;
  numberOfAdSets: number;
  namingPrefix: string;
  pageId: string;
  postId: string;
  pixelId: string;
}

export interface CampaignDraftAdSet {
  draftId: string;
  name: string;
  budgetSharePercent: number;
  lifetimeBudgetRaw: string;
  optimizationGoal: string;
  billingEvent: string;
  bidStrategy: string;
  targeting: {
    countries: string[];
    ageMin: number;
    ageMax: number;
    genders: string[];
    interests: string[];
    audienceType: string;
  };
  placements: string[];
  rationale: string;
}

export interface CampaignDraftAd {
  draftId: string;
  adSetDraftId: string;
  name: string;
  headline: string;
  primaryText: string;
  cta: string;
  format: string;
  creativeBrief: string;
}

export interface CampaignDraft {
  summary: string;
  confidence: number;
  campaign: {
    name: string;
    objective: string;
    totalBudgetRaw: string;
    durationDays: number;
    specialAdCategories: string[];
    rationale: string;
  };
  adSets: CampaignDraftAdSet[];
  ads: CampaignDraftAd[];
  testPlan: Array<{
    day: number;
    action: string;
    successMetric: string;
    decisionRule: string;
  }>;
  risks: string[];
  preflightChecks: Array<{
    label: string;
    status: 'pass' | 'warning' | 'required';
    detail: string;
  }>;
}

export type CampaignBuilderState =
  | { status: 'idle' }
  | { status: 'generating' }
  | { status: 'success'; draft: CampaignDraft }
  | { status: 'error'; error: string };

export interface CampaignCreationResult {
  campaignId: string;
  adSetIds: string[];
  adIds: string[];
  skippedAds: boolean;
  status: 'PAUSED';
}

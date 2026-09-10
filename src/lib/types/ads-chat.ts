import type { CampaignKpiSummary } from '@/lib/campaign-kpis';
import type { AccountLearningProfile } from './ai-learning';

export interface AdsChatMetrics {
  spend: number | null;
  impressions: number | null;
  reach: number | null;
  frequency: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  objectiveKpis: CampaignKpiSummary;
}

export interface AdsChatEntity {
  entityType: 'campaign' | 'adset' | 'ad';
  id: string;
  name: string;
  href: string;
  campaignId: string;
  campaignName: string;
  adsetId?: string;
  adsetName?: string;
  status?: string;
  objective: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  current: AdsChatMetrics;
  previous: AdsChatMetrics;
}

export interface AdsChatSnapshot {
  accountId: string;
  accountName: string;
  currency: string;
  collectedAt: string;
  period: { days: number; current: { since: string; until: string }; previous: { since: string; until: string } };
  campaigns: AdsChatEntity[];
  adsets: AdsChatEntity[];
  ads: AdsChatEntity[];
  coverage: { campaignCount: number; adsetCount: number; adCount: number; notes: string[] };
}

export interface AdsChatAnswer {
  answer: string;
  summary: string;
  tables: Array<{ title: string; columns: string[]; rows: Array<{ cells: string[] }> }>;
  links: Array<{ entityType: 'campaign' | 'adset' | 'ad'; entityId: string; entityName: string; href: string; reason: string }>;
  recommendations: Array<{ priority: 'high' | 'medium' | 'low'; action: string; rationale: string; entityId: string; entityName: string; href: string }>;
  caveats: string[];
}

export type AdsChatMessage =
  | { id: string; role: 'user'; content: string }
  | { id: string; role: 'assistant'; content: string; result: AdsChatAnswer };

export interface AdsChatRequest {
  viewContext?: import('../ai-view-context').AIViewContext;
  question: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  snapshot: AdsChatSnapshot;
  learningProfile?: AccountLearningProfile | null;
}

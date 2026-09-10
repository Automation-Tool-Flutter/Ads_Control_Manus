import type { AdsChatMetrics } from './ads-chat';
import type { PlanActionType, PlanItemStatus } from './optimization-plan';

export type LearningCheckpointDay = 3 | 7 | 14;
export type OutcomeVerdict = 'improved' | 'neutral' | 'worse' | 'insufficient_data';

export interface LearningCheckpoint {
  days: LearningCheckpointDay;
  evaluatedAt: string;
  beforePeriod: { since: string; until: string };
  afterPeriod: { since: string; until: string };
  before: AdsChatMetrics;
  after: AdsChatMetrics;
  primaryMetric: string;
  improvementPercent: number | null;
  spendChangePercent: number | null;
  verdict: OutcomeVerdict;
  explanation: string;
}

export interface LearningRecord {
  id: string;
  accountId: string;
  source: 'optimization_plan' | 'recommendation' | 'budget_optimizer';
  sourceId: string;
  planId?: string;
  entityType: 'campaign' | 'adset' | 'ad';
  entityId: string;
  entityName: string;
  href: string;
  objective: string;
  objectiveFamily: string;
  recommendationTitle: string;
  actionType: PlanActionType | 'update_campaign_budget';
  changePercent: number;
  accepted: boolean;
  userOutcome: PlanItemStatus | 'unknown';
  appliedAt: string;
  rolledBackAt?: string;
  baselineContext: AdsChatMetrics;
  checkpoints: LearningCheckpoint[];
}

export interface AccountLearningProfile {
  accountId: string;
  generatedAt: string;
  sampleSize: number;
  summary: string;
  confidence: number;
  acceptanceRate: number;
  safeBudgetChangePercent: number | null;
  successfulActionTypes: Array<{ actionType: string; successRate: number; sampleSize: number; learning: string }>;
  ineffectiveActionTypes: Array<{ actionType: string; sampleSize: number; learning: string }>;
  kpiBenchmarks: Array<{ objectiveFamily: string; metric: string; medianValue: number; sampleSize: number; interpretation: string }>;
  audienceLearnings: string[];
  creativeLearnings: string[];
  nextRules: string[];
  caveats: string[];
}

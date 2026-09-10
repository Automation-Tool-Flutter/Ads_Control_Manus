import type { AdsChatSnapshot } from './ads-chat';
import type { AccountLearningProfile } from './ai-learning';

export type PlanItemStatus = 'pending' | 'applied' | 'monitoring' | 'success' | 'ineffective' | 'rolled_back';
export type PlanActionType = 'pause_entity' | 'activate_entity' | 'adjust_daily_budget' | 'replace_creative' | 'expand_audience' | 'review_tracking' | 'review_performance' | 'monitor';

export interface PlanExecution {
  appliedAt: string;
  previousStatus?: string;
  previousDailyBudgetRaw?: string;
  rolledBackAt?: string;
}

export interface OptimizationPlanItem {
  id: string;
  day: number;
  phase: string;
  title: string;
  description: string;
  entityType: 'campaign' | 'adset' | 'ad';
  entityId: string;
  entityName: string;
  href: string;
  evidence: string[];
  successMetric: string;
  reviewAfterDays: number;
  action: {
    type: PlanActionType;
    applyMode: 'automatic' | 'manual';
    canApply: boolean;
    changePercent: number;
    currentStatus: string;
    targetStatus: string;
    currentDailyBudgetRaw: string;
    proposedDailyBudgetRaw: string;
    instruction: string;
  };
  status: PlanItemStatus;
  execution?: PlanExecution;
}

export interface OptimizationPlan {
  id: string;
  title: string;
  summary: string;
  durationDays: 7 | 14;
  createdAt: string;
  startDate: string;
  currency: string;
  confidence: number;
  primaryGoal: string;
  baselinePeriod: AdsChatSnapshot['period'];
  items: OptimizationPlanItem[];
  risks: string[];
  guardrails: string[];
}

export interface OptimizationPlanRequest {
  durationDays: 7 | 14;
  primaryGoal: string;
  snapshot: AdsChatSnapshot;
  learningProfile?: AccountLearningProfile | null;
}

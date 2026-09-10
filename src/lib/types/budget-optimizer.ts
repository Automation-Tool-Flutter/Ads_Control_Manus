export type BudgetGoal = 'revenue' | 'conversions' | 'leads' | 'traffic' | 'roas';
export type BudgetMode = 'conservative' | 'balanced' | 'aggressive';
export type BudgetDirection = 'increase' | 'hold' | 'decrease';

export interface BudgetCampaignInput {
  id: string;
  name: string;
  status: string;
  objective: string;
  dailyBudgetRaw: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  objectiveKpis?: CampaignKpiSummary;
}

export interface BudgetOptimizerPayload {
  currency: string;
  dateFilter: string;
  goal: BudgetGoal;
  mode: BudgetMode;
  targetTotalBudgetRaw: string;
  campaigns: BudgetCampaignInput[];
}

export interface BudgetCampaignEvaluation {
  campaignId: string;
  score: number;
  direction: BudgetDirection;
  rationale: string;
  expectedImpact: string;
}

export interface BudgetAllocation extends BudgetCampaignEvaluation {
  campaignName: string;
  currentDailyBudgetRaw: string;
  proposedDailyBudgetRaw: string;
  changePercent: number;
  canApply: boolean;
}

export interface BudgetPlan {
  summary: string;
  goal: BudgetGoal;
  mode: BudgetMode;
  confidence: number;
  currency: string;
  currentTotalBudgetRaw: string;
  targetTotalBudgetRaw: string;
  feasibleMinBudgetRaw: string;
  feasibleMaxBudgetRaw: string;
  warnings: string[];
  allocations: BudgetAllocation[];
}

export type BudgetOptimizerState =
  | { status: 'idle' }
  | { status: 'analyzing' }
  | { status: 'success'; plan: BudgetPlan }
  | { status: 'error'; error: string };
import type { CampaignKpiSummary } from '../campaign-kpis';

import type {
  BudgetAllocation,
  BudgetCampaignEvaluation,
  BudgetCampaignInput,
  BudgetMode,
} from './types/budget-optimizer';

export const BUDGET_MODE_LIMITS: Record<BudgetMode, number> = {
  conservative: 0.1,
  balanced: 0.2,
  aggressive: 0.4,
};

function parseRawBudget(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
}

export function getBudgetRange(campaigns: BudgetCampaignInput[], mode: BudgetMode) {
  const limit = BUDGET_MODE_LIMITS[mode];
  const bounds = campaigns.map(campaign => {
    const current = parseRawBudget(campaign.dailyBudgetRaw);
    return {
      campaignId: campaign.id,
      current,
      min: Math.max(1, Math.round(current * (1 - limit))),
      max: Math.max(1, Math.round(current * (1 + limit))),
    };
  });

  return {
    bounds,
    current: bounds.reduce((sum, item) => sum + item.current, 0),
    min: bounds.reduce((sum, item) => sum + item.min, 0),
    max: bounds.reduce((sum, item) => sum + item.max, 0),
  };
}

function distributeDelta(
  values: Map<string, number>,
  bounds: ReturnType<typeof getBudgetRange>['bounds'],
  scores: Map<string, number>,
  delta: number,
) {
  const increasing = delta > 0;
  let remaining = Math.abs(delta);

  while (remaining > 0) {
    const candidates = bounds.filter(item => {
      const value = values.get(item.campaignId) ?? item.current;
      return increasing ? value < item.max : value > item.min;
    });
    if (candidates.length === 0) break;

    const weights = candidates.map(item => {
      const score = scores.get(item.campaignId) ?? 50;
      return increasing ? Math.max(1, score) : Math.max(1, 101 - score);
    });
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let distributed = 0;

    candidates.forEach((item, index) => {
      const left = remaining - distributed;
      if (left <= 0) return;
      const value = values.get(item.campaignId) ?? item.current;
      const capacity = increasing ? item.max - value : value - item.min;
      const weightedShare = Math.max(1, Math.round(remaining * (weights[index] / totalWeight)));
      const amount = Math.min(capacity, weightedShare, left);
      values.set(item.campaignId, increasing ? value + amount : value - amount);
      distributed += amount;
    });

    if (distributed === 0) break;
    remaining -= distributed;
  }
}

export function buildBudgetAllocations(
  campaigns: BudgetCampaignInput[],
  evaluations: BudgetCampaignEvaluation[],
  targetTotal: number,
  mode: BudgetMode,
): BudgetAllocation[] {
  const range = getBudgetRange(campaigns, mode);
  if (targetTotal < range.min || targetTotal > range.max) {
    throw new Error(`Target budget must be between ${range.min} and ${range.max} raw units.`);
  }

  const evaluationMap = new Map(evaluations.map(item => [item.campaignId, item]));
  const scores = new Map(evaluations.map(item => [item.campaignId, item.score]));
  // Start every campaign at the mode's lower bound, then distribute the
  // available budget toward higher-scoring campaigns. This also reallocates
  // budget when the target total is unchanged.
  const values = new Map(range.bounds.map(item => [item.campaignId, item.min]));
  distributeDelta(values, range.bounds, scores, targetTotal - range.min);

  return campaigns.map(campaign => {
    const current = parseRawBudget(campaign.dailyBudgetRaw);
    const proposed = values.get(campaign.id) ?? current;
    const evaluation = evaluationMap.get(campaign.id) ?? {
      campaignId: campaign.id,
      score: 50,
      direction: 'hold' as const,
      rationale: 'Insufficient AI evaluation; budget held near the current allocation.',
      expectedImpact: 'No material change expected.',
    };

    return {
      ...evaluation,
      campaignId: campaign.id,
      direction: proposed > current ? 'increase' : proposed < current ? 'decrease' : 'hold',
      campaignName: campaign.name,
      currentDailyBudgetRaw: String(current),
      proposedDailyBudgetRaw: String(proposed),
      changePercent: current > 0 ? Number((((proposed - current) / current) * 100).toFixed(1)) : 0,
      canApply: proposed !== current,
    };
  });
}

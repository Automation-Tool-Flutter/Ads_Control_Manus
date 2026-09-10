'use client';

import { useCallback, useState } from 'react';
import { amountToRawBudget, dateFilterLabel } from '@/lib/utils';
import type { Campaign, CampaignInsight, DatePreset, DateRange } from '@/lib/types';
import type {
  BudgetGoal,
  BudgetMode,
  BudgetOptimizerState,
  BudgetPlan,
} from '@/lib/types/budget-optimizer';
import { deriveCampaignKpis } from '@/lib/campaign-kpis';
import { collectBudget } from '@/lib/action-center';

interface AnalyzeInput {
  accountId: string;
  campaigns: Campaign[];
  insights: Record<string, CampaignInsight>;
  currency: string;
  dateFilter: DatePreset | DateRange;
  goal: BudgetGoal;
  mode: BudgetMode;
  targetTotalBudget: string;
}

export function useBudgetOptimizer() {
  const [state, setState] = useState<BudgetOptimizerState>({ status: 'idle' });

  const analyze = useCallback(async (input: AnalyzeInput) => {
    const eligible = input.campaigns.filter(campaign =>
      campaign.status === 'ACTIVE' && Number(campaign.daily_budget) > 0,
    );
    if (eligible.length === 0) {
      setState({ status: 'error', error: 'No active campaigns with a daily budget were found.' });
      return;
    }

    const targetTotalBudgetRaw = amountToRawBudget(input.targetTotalBudget, input.currency);
    if (!targetTotalBudgetRaw || Number(targetTotalBudgetRaw) <= 0) {
      setState({ status: 'error', error: 'Enter a valid total daily budget.' });
      return;
    }

    setState({ status: 'analyzing' });
    try {
      const response = await fetch('/api/budget-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency: input.currency,
          dateFilter: dateFilterLabel(input.dateFilter),
          goal: input.goal,
          mode: input.mode,
          targetTotalBudgetRaw,
          campaigns: eligible.map(campaign => {
            const insight = input.insights[campaign.id];
            return {
              id: campaign.id,
              name: campaign.name,
              status: campaign.status,
              objective: campaign.objective,
              dailyBudgetRaw: campaign.daily_budget as string,
              spend: insight?.spend,
              impressions: insight?.impressions,
              clicks: insight?.clicks,
              ctr: insight?.ctr,
              cpc: insight?.cpc,
              cpm: insight?.cpm,
              objectiveKpis: deriveCampaignKpis(campaign.objective, insight),
            };
          }),
        }),
        signal: AbortSignal.timeout(60_000),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Budget optimization failed.');
      setState({ status: 'success', plan: payload as BudgetPlan });
      collectBudget(input.accountId, payload as BudgetPlan);
    } catch (error) {
      setState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Budget optimization failed.',
      });
    }
  }, []);

  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, analyze, reset };
}

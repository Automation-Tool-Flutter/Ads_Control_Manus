import { graphFetch, graphMutate, cacheInvalidatePrefix } from './client';
import { GRAPH_API_BASE } from '@/lib/constants';
import type { OptimizationPlanItem, PlanExecution } from '@/lib/types/optimization-plan';

interface LiveEntity { status?: string; daily_budget?: string; }

export async function applyPlanItem(item: OptimizationPlanItem, token: string): Promise<PlanExecution> {
  if (!item.action.canApply) return { appliedAt: new Date().toISOString() };
  const fields = item.action.type === 'adjust_daily_budget' ? 'status,daily_budget' : 'status';
  const live = await graphFetch<LiveEntity>(`/${item.entityId}`, { fields }, token, { cache: false });
  if (item.action.type === 'pause_entity' || item.action.type === 'activate_entity') {
    if (live.status === item.action.targetStatus) throw new Error(`This entity already has status ${item.action.targetStatus}. Refresh or generate a new plan.`);
    if (live.status !== item.action.currentStatus) throw new Error(`Status changed from ${item.action.currentStatus} sang ${live.status ?? 'unknown'}. Generate a new plan.`);
    await graphMutate(`/${item.entityId}`, { status: item.action.targetStatus }, token);
    cacheInvalidatePrefix(`${GRAPH_API_BASE}/${item.entityId}`);
    return { appliedAt: new Date().toISOString(), previousStatus: live.status };
  }
  if (item.action.type === 'adjust_daily_budget') {
    if (!live.daily_budget) throw new Error('This entity does not currently use a daily budget.');
    if (live.daily_budget !== item.action.currentDailyBudgetRaw) throw new Error('The daily budget changed after this plan was created. Generate a new plan.');
    await graphMutate(`/${item.entityId}`, { daily_budget: item.action.proposedDailyBudgetRaw }, token);
    cacheInvalidatePrefix(`${GRAPH_API_BASE}/${item.entityId}`);
    return { appliedAt: new Date().toISOString(), previousDailyBudgetRaw: live.daily_budget };
  }
  return { appliedAt: new Date().toISOString() };
}

export async function rollbackPlanItem(item: OptimizationPlanItem, token: string): Promise<PlanExecution> {
  if (!item.execution) throw new Error('No execution history is available for rollback.');
  if (item.action.applyMode === 'manual') return { ...item.execution, rolledBackAt: new Date().toISOString() };
  if (item.execution.previousStatus) await graphMutate(`/${item.entityId}`, { status: item.execution.previousStatus }, token);
  else if (item.execution.previousDailyBudgetRaw) await graphMutate(`/${item.entityId}`, { daily_budget: item.execution.previousDailyBudgetRaw }, token);
  else throw new Error('The previous Meta value could not be found.');
  cacheInvalidatePrefix(`${GRAPH_API_BASE}/${item.entityId}`);
  return { ...item.execution, rolledBackAt: new Date().toISOString() };
}

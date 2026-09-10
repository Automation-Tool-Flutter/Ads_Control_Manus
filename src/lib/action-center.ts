import type { OptimizationPlan } from './types/optimization-plan';
import type { AlertCenterResult } from './types/alerts';
import type { BudgetPlan } from './types/budget-optimizer';
import type { GeminiAnalysis } from './types/optimize';
import type { LearningRecord } from './types/ai-learning';

export type ActionSource = 'analysis' | 'budget' | 'alerts' | 'plan' | 'chat' | 'learning';
export type ActionDirection = 'pause' | 'activate' | 'increase' | 'decrease' | 'review';
export interface ActionItem {
  id: string; source: ActionSource; entityId: string; entityName: string;
  title: string; evidence: string[]; href: string; priority: 'high' | 'medium' | 'low';
  direction: ActionDirection; target: string; updatedAt: string; dueAt?: string;
}
export interface ActionGroup extends ActionItem { members: ActionItem[]; conflict: boolean; review: 'pending' | 'reviewed' | 'dismissed' }
export const ACTIONS_EVENT = 'ai-actions-updated';
const key = (id: string) => 'ai-action-center:' + id;
export function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; }
}
export function saveActionSource(accountId: string, source: ActionSource, items: ActionItem[]) {
  if (typeof window === 'undefined') return;
  try {
    const old = readLocal<Record<string, ActionItem[]>>(key(accountId), {});
    localStorage.setItem(key(accountId), JSON.stringify({ ...old, [source]: items.slice(-200) }));
    window.dispatchEvent(new Event(ACTIONS_EVENT));
  } catch { /* The generating feature remains usable if browser storage is full. */ }
}
export function markActionGroups(accountId: string, ids: string[], value: ActionGroup['review']) {
  try {
    const statuses = readLocal<Record<string, ActionGroup['review']>>(key(accountId) + ':review', {});
    ids.forEach(id => { statuses[id] = value; });
    localStorage.setItem(key(accountId) + ':review', JSON.stringify(statuses));
    window.dispatchEvent(new Event(ACTIONS_EVENT));
  } catch { throw new Error('Unable to save the status in this browser.'); }
}
export function actionIdentity(item: ActionItem) {
  // Never merge different targets, or free-text recommendations solely by entity.
  return JSON.stringify([item.entityId, item.direction, item.direction === 'review' ? item.title.trim().toLocaleLowerCase() : item.target]);
}
export function groupActions(items: ActionItem[], statuses: Record<string, ActionGroup['review']> = {}): ActionGroup[] {
  const groups = new Map<string, ActionGroup>();
  for (const item of items) {
    const id = actionIdentity(item);
    const existing = groups.get(id);
    if (existing) { existing.members.push(item); if (item.priority === 'high') existing.priority = 'high'; }
    else groups.set(id, { ...item, id, members: [item], conflict: false, review: statuses[id] ?? 'pending' });
  }
  const result = Array.from(groups.values());
  for (const item of result) {
    item.conflict = item.review === 'pending' && item.direction !== 'review' && result.some(other =>
      other !== item && other.review === 'pending' && other.entityId === item.entityId && other.direction !== 'review' &&
      ((item.direction === 'pause' && ['activate', 'increase'].includes(other.direction)) ||
      (other.direction === 'pause' && ['activate', 'increase'].includes(item.direction)) ||
      (['increase', 'decrease'].includes(item.direction) && ['increase', 'decrease'].includes(other.direction) &&
      (item.direction !== other.direction || item.target !== other.target))));
  }
  const score = (item: ActionGroup) => (item.conflict ? 10 : 0) + ({ high: 3, medium: 2, low: 1 }[item.priority]);
  return result.sort((a,b) => score(b) - score(a) || a.updatedAt.localeCompare(b.updatedAt));
}
export function planActions(accountId: string, plan: OptimizationPlan): ActionItem[] {
  return (Array.isArray(plan?.items) ? plan.items : []).filter(item => item.status === 'pending').map(item => {
    const direction: ActionDirection = item.action.type === 'pause_entity' ? 'pause' : item.action.type === 'activate_entity' ? 'activate' : item.action.type === 'adjust_daily_budget' ? (item.action.changePercent > 0 ? 'increase' : 'decrease') : 'review';
    const due = new Date(plan.startDate); due.setUTCDate(due.getUTCDate() + Math.max(0, item.day - 1));
    return { id: 'plan:' + plan.id + ':' + item.id, source: 'plan', entityId: item.entityId, entityName: item.entityName, title: item.title, evidence: [item.description, ...item.evidence], href: `/accounts/${accountId}/optimization-plan?currency=${encodeURIComponent(plan.currency)}`, priority: 'medium', direction, target: direction === 'pause' ? 'PAUSED' : direction === 'activate' ? 'ACTIVE' : item.action.proposedDailyBudgetRaw, updatedAt: plan.createdAt, dueAt: Number.isFinite(due.getTime()) ? due.toISOString() : undefined };
  });
}
export function learningActions(accountId: string, records: LearningRecord[], now = Date.now()): ActionItem[] {
  return records.filter(record => record.accepted && !record.rolledBackAt && record.userOutcome !== 'rolled_back').flatMap(record => {
    const days = [3,7,14].find(day => !record.checkpoints?.some(point => point.days === day) && Date.parse(record.appliedAt) + day * 86400000 <= now);
    return days ? [{ id: `learning:${record.id}:${days}`, source: 'learning' as const, entityId: record.entityId, entityName: record.entityName, title: `Evaluate after ${days} days: ${record.recommendationTitle}`, evidence: ['The before-and-after evaluation is due. No outcome has been established for this checkpoint.'], href: `/accounts/${accountId}/ai-learning`, priority: 'high' as const, direction: 'review' as const, target: '', updatedAt: record.appliedAt, dueAt: new Date(Date.parse(record.appliedAt) + days * 86400000).toISOString() }] : [];
  });
}
export function readAccountActions(accountId: string): ActionGroup[] {
  const sources = readLocal<Record<string, ActionItem[]>>(key(accountId), {});
  const stored = Object.values(sources).flatMap(value => Array.isArray(value) ? value : []).filter(item => item && typeof item.title === 'string' && typeof item.updatedAt === 'string' && item.source !== 'plan' && item.source !== 'learning');
  const plan = readLocal<OptimizationPlan | null>('optimization-plan:' + accountId, null);
  const records = readLocal<LearningRecord[]>('ai-learning-records:' + accountId, []);
  const validRecords = Array.isArray(records) ? records : [];
  const unresolved = stored.filter(item => !validRecords.some(record =>
    record.accepted && record.entityId === item.entityId && Date.parse(record.appliedAt) >= Date.parse(item.updatedAt) &&
    ((item.source === 'budget' && record.source === 'budget_optimizer') ||
    (item.source === 'analysis' && record.source === 'recommendation' && record.recommendationTitle === item.title))));
  return groupActions([...unresolved, ...(plan ? planActions(accountId, plan) : []), ...learningActions(accountId, validRecords)], readLocal(key(accountId) + ':review', {}));
}
export function collectAlerts(accountId: string, result: AlertCenterResult) {
  saveActionSource(accountId, 'alerts', result.alerts.map(item => ({ id: item.id, source: 'alerts', entityId: item.entityId, entityName: item.entityName, title: item.title, evidence: [item.evidence, item.explanation, item.recommendedAction], href: `/accounts/${accountId}/alerts`, priority: item.severity === 'critical' ? 'high' : item.severity === 'warning' ? 'medium' : 'low', direction: 'review', target: '', updatedAt: result.analyzedAt })));
}
export function collectBudget(accountId: string, plan: BudgetPlan) {
  const updatedAt = new Date().toISOString();
  saveActionSource(accountId, 'budget', plan.allocations.filter(item => item.direction !== 'hold').map(item => ({ id: 'budget:' + item.campaignId, source: 'budget', entityId: item.campaignId, entityName: item.campaignName, title: `${item.direction === 'increase' ? 'Increase' : 'Decrease'} budget ${Math.abs(item.changePercent).toFixed(1)}%`, evidence: [item.rationale, item.expectedImpact, ...plan.warnings], href: `/accounts/${accountId}/budget-optimizer`, priority: 'medium', direction: item.direction === 'increase' ? 'increase' : 'decrease', target: item.proposedDailyBudgetRaw, updatedAt })));
}
export function collectAnalysis(accountId: string, analysis: GeminiAnalysis, updatedAt = new Date().toISOString()) {
  saveActionSource(accountId, 'analysis', analysis.angles.flatMap(angle => angle.recommendations).map((item, i) => {
    const action = item.action;
    const direction: ActionDirection = action?.type === 'pause_campaign' ? 'pause' : action?.type === 'activate_campaign' ? 'activate' : action?.proposedDailyBudget && Number(action.proposedDailyBudget) !== Number(action.currentDailyBudget) ? (Number(action.proposedDailyBudget) > Number(action.currentDailyBudget) ? 'increase' : 'decrease') : 'review';
    return { id: 'analysis:' + i, source: 'analysis', entityId: action?.entityId ?? accountId, entityName: action?.entityName ?? 'Account', title: item.title, evidence: [item.description, ...(action ? [action.reason, action.expectedImpact] : [])], href: `/accounts/${accountId}/campaigns`, priority: item.priority, direction, target: action?.proposedDailyBudget || (direction === 'pause' ? 'PAUSED' : direction === 'activate' ? 'ACTIVE' : ''), updatedAt };
  }));
}

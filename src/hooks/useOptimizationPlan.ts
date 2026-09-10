'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAdsChatSnapshot } from '@/lib/api/adsChat';
import { applyPlanItem, rollbackPlanItem } from '@/lib/api/optimizationPlan';
import { patchLearningRecord, upsertLearningRecord } from '@/lib/learning-store';
import { getLearningProfile } from '@/lib/learning-store';
import { ACTIONS_EVENT } from '@/lib/action-center';
import type { AdsChatSnapshot } from '@/lib/types/ads-chat';
import type { OptimizationPlan, OptimizationPlanItem, PlanItemStatus } from '@/lib/types/optimization-plan';

type DataState = { status: 'loading' } | { status: 'ready'; snapshot: AdsChatSnapshot } | { status: 'error'; error: string };

export function useOptimizationPlan(accountId: string, accountName: string, currency: string, durationDays: 7 | 14, token: string | null) {
  const [dataState, setDataState] = useState<DataState>({ status: 'loading' });
  const [plan, setPlan] = useState<OptimizationPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback((next: OptimizationPlan | null) => {
    setPlan(next);
    try { if (next) localStorage.setItem(`optimization-plan:${accountId}`, JSON.stringify(next)); else localStorage.removeItem(`optimization-plan:${accountId}`); window.dispatchEvent(new Event(ACTIONS_EVENT)); } catch { /* ignore */ }
  }, [accountId]);

  useEffect(() => { try { const raw = localStorage.getItem(`optimization-plan:${accountId}`); setPlan(raw ? JSON.parse(raw) : null); } catch { setPlan(null); } }, [accountId]);
  const load = useCallback(async () => {
    if (!token) return; setDataState({ status: 'loading' }); setError(null);
    try { setDataState({ status: 'ready', snapshot: await getAdsChatSnapshot(accountId, accountName, currency, durationDays, token) }); }
    catch (reason) { setDataState({ status: 'error', error: reason instanceof Error ? reason.message : 'Unable to load advertising data.' }); }
  }, [accountId, accountName, currency, durationDays, token]);
  useEffect(() => { load(); }, [load]);

  const generate = useCallback(async (primaryGoal: string) => {
    if (dataState.status !== 'ready') return; setIsGenerating(true); setError(null);
    try {
      const response = await fetch('/api/optimization-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ durationDays, primaryGoal, snapshot: dataState.snapshot, learningProfile: getLearningProfile(accountId) }), signal: AbortSignal.timeout(75_000) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? 'Unable to generate a plan.'); persist(payload as OptimizationPlan);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to generate a plan.'); }
    finally { setIsGenerating(false); }
  }, [accountId, dataState, durationDays, persist]);

  const updateItem = useCallback((itemId: string, updater: (item: OptimizationPlanItem) => OptimizationPlanItem) => {
    if (!plan) return; persist({ ...plan, items: plan.items.map(item => item.id === itemId ? updater(item) : item) });
  }, [plan, persist]);
  const learningId = useCallback((itemId: string) => plan ? `plan:${plan.id}:${itemId}` : '', [plan]);
  const setStatus = useCallback((itemId: string, status: PlanItemStatus) => {
    updateItem(itemId, item => ({ ...item, status }));
    const id = learningId(itemId); if (id) patchLearningRecord(accountId, id, { userOutcome: status });
  }, [accountId, learningId, updateItem]);
  const apply = useCallback(async (item: OptimizationPlanItem) => {
    if (!token || workingId) return; setWorkingId(item.id); setError(null);
    try {
      const execution = await applyPlanItem(item, token); updateItem(item.id, current => ({ ...current, status: 'applied', execution }));
      const entities = dataState.status === 'ready' ? [...dataState.snapshot.campaigns, ...dataState.snapshot.adsets, ...dataState.snapshot.ads] : [];
      const entity = entities.find(candidate => candidate.id === item.entityId);
      if (plan && entity) upsertLearningRecord({
        id: `plan:${plan.id}:${item.id}`, accountId, source: 'optimization_plan', sourceId: item.id, planId: plan.id,
        entityType: item.entityType, entityId: item.entityId, entityName: item.entityName, href: item.href, objective: entity.objective,
        objectiveFamily: entity.current.objectiveKpis.objectiveFamily, recommendationTitle: item.title, actionType: item.action.type,
        changePercent: item.action.changePercent, accepted: true, userOutcome: 'applied', appliedAt: execution.appliedAt,
        baselineContext: entity.current, checkpoints: [],
      });
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to apply this action.'); }
    finally { setWorkingId(null); }
  }, [accountId, dataState, plan, token, workingId, updateItem]);
  const rollback = useCallback(async (item: OptimizationPlanItem) => {
    if (!token || workingId) return; setWorkingId(item.id); setError(null);
    try { const execution = await rollbackPlanItem(item, token); updateItem(item.id, current => ({ ...current, status: 'rolled_back', execution })); const id = learningId(item.id); if (id) patchLearningRecord(accountId, id, { userOutcome: 'rolled_back', rolledBackAt: execution.rolledBackAt }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to roll back this action.'); }
    finally { setWorkingId(null); }
  }, [accountId, learningId, token, workingId, updateItem]);

  return { dataState, plan, isGenerating, workingId, error, generate, apply, rollback, setStatus, clear: () => persist(null), reload: load };
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { checkpointDue, evaluateLearningCheckpoint } from '@/lib/api/aiLearning';
import { getLearningProfile, getLearningRecords, saveLearningProfile, saveLearningRecords } from '@/lib/learning-store';
import type { AccountLearningProfile, LearningCheckpointDay, LearningRecord } from '@/lib/types/ai-learning';

export function useAiLearning(accountId: string, token: string | null) {
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [profile, setProfile] = useState<AccountLearningProfile | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isProfiling, setIsProfiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => { setRecords(getLearningRecords(accountId)); setProfile(getLearningProfile(accountId)); }, [accountId]);
  useEffect(() => { reload(); }, [reload]);
  const due = useMemo(() => records.flatMap(record => ([3, 7, 14] as LearningCheckpointDay[]).filter(days => checkpointDue(record, days)).map(days => ({ record, days }))), [records]);

  const evaluateDue = useCallback(async () => {
    if (!token || !due.length) return; setIsEvaluating(true); setError(null);
    const next = records.map(record => ({ ...record, checkpoints: [...record.checkpoints] }));
    let failures = 0;
    // Bound each run to avoid a large history producing hundreds of Meta calls at once.
    for (const task of due.slice(0, 10)) {
      try {
        const checkpoint = await evaluateLearningCheckpoint(task.record, task.days, token);
        const target = next.find(item => item.id === task.record.id);
        if (target && !target.checkpoints.some(item => item.days === task.days)) target.checkpoints.push(checkpoint);
      } catch { failures += 1; }
    }
    saveLearningRecords(accountId, next); setRecords(next); setIsEvaluating(false);
    if (failures) setError(`${failures} checkpoints could not retrieve data from Meta.`);
  }, [accountId, due, records, token]);

  const generateProfile = useCallback(async () => {
    if (!records.length) return; setIsProfiling(true); setError(null);
    try {
      const response = await fetch('/api/learning-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId, records }), signal: AbortSignal.timeout(75_000) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? 'Unable to generate a learning profile.');
      saveLearningProfile(payload as AccountLearningProfile); setProfile(payload as AccountLearningProfile);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to generate a learning profile.'); }
    finally { setIsProfiling(false); }
  }, [accountId, records]);

  return { records, profile, dueCount: due.length, isEvaluating, isProfiling, error, evaluateDue, generateProfile, reload };
}

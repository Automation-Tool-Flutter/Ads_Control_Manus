import type { LearningRecord, AccountLearningProfile } from './types/ai-learning';

const recordsKey = (accountId: string) => `ai-learning-records:${accountId}`;
const profileKey = (accountId: string) => `ai-learning-profile:${accountId}`;

export function getLearningRecords(accountId: string): LearningRecord[] {
  if (typeof window === 'undefined') return [];
  try { const value = JSON.parse(localStorage.getItem(recordsKey(accountId)) ?? '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}

export function saveLearningRecords(accountId: string, records: LearningRecord[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(recordsKey(accountId), JSON.stringify(records.slice(-250))); window.dispatchEvent(new CustomEvent('ai-learning-updated', { detail: { accountId } })); } catch { /* ignore */ }
}

export function upsertLearningRecord(record: LearningRecord) {
  const records = getLearningRecords(record.accountId);
  const index = records.findIndex(item => item.id === record.id);
  if (index >= 0) records[index] = { ...records[index], ...record, checkpoints: record.checkpoints.length ? record.checkpoints : records[index].checkpoints };
  else records.push(record);
  saveLearningRecords(record.accountId, records);
}

export function patchLearningRecord(accountId: string, id: string, patch: Partial<LearningRecord>) {
  const records = getLearningRecords(accountId);
  const index = records.findIndex(item => item.id === id);
  if (index < 0) return;
  records[index] = { ...records[index], ...patch };
  saveLearningRecords(accountId, records);
}

export function getLearningProfile(accountId: string): AccountLearningProfile | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(profileKey(accountId)) ?? 'null'); } catch { return null; }
}

export function saveLearningProfile(profile: AccountLearningProfile) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(profileKey(profile.accountId), JSON.stringify(profile)); window.dispatchEvent(new CustomEvent('ai-learning-updated', { detail: { accountId: profile.accountId } })); } catch { /* ignore */ }
}

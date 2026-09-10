'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAdsChatSnapshot } from '@/lib/api/adsChat';
import { getLearningProfile } from '@/lib/learning-store';
import { useAIViewContext } from './useAIViewContext';
import { saveActionSource } from '@/lib/action-center';
import type { AdsChatAnswer, AdsChatMessage, AdsChatSnapshot } from '@/lib/types/ads-chat';

type DataState = { status: 'loading' } | { status: 'ready'; snapshot: AdsChatSnapshot } | { status: 'error'; error: string };

export function useAdsChat(accountId: string, accountName: string, currency: string, days: number, token: string | null, channel = 'full') {
  const viewContext = useAIViewContext();
  const [dataState, setDataState] = useState<DataState>({ status: 'loading' });
  const [messages, setMessages] = useState<AdsChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const sendController = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const storageKey = `ads-chat:${accountId}:${days}${channel === 'full' ? '' : ':' + channel}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const id = ++requestId.current; setDataState({ status: 'loading' }); setError(null);
    try { const snapshot = await getAdsChatSnapshot(accountId, accountName, currency, days, token); if (id === requestId.current) setDataState({ status: 'ready', snapshot }); }
    catch (reason) { if (id === requestId.current) setDataState({ status: 'error', error: reason instanceof Error ? reason.message : 'Unable to load advertising data.' }); }
  }, [accountId, accountName, currency, days, token]);

  useEffect(() => { load(); return () => { requestId.current++; }; }, [load]);
  useEffect(() => {
    try { const stored = JSON.parse(localStorage.getItem(storageKey) ?? '[]'); setMessages(Array.isArray(stored) ? stored.filter(item => item && typeof item.content === 'string' && (item.role === 'user' || (item.role === 'assistant' && item.result && Array.isArray(item.result.tables) && Array.isArray(item.result.links) && Array.isArray(item.result.recommendations) && Array.isArray(item.result.caveats)))).slice(-20) : []); } catch { setMessages([]); }
    setLoadedKey(storageKey); setIsSending(false); busy.current = false;
    return () => { sendController.current?.abort(); sendController.current = null; busy.current = false; };
  }, [storageKey, token]);
  useEffect(() => { if (loadedKey !== storageKey) return; try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-20))); } catch { /* ignore */ } }, [storageKey, loadedKey, messages]);

  const send = useCallback(async (question: string) => {
    if (dataState.status !== 'ready' || dataState.snapshot.accountId !== accountId || dataState.snapshot.period.days !== days || busy.current || !question.trim()) return;
    busy.current = true;
    const controller = new AbortController();
    sendController.current = controller;
    const timeout = setTimeout(() => controller.abort(), 75_000);
    const userMessage: AdsChatMessage = { id: crypto.randomUUID(), role: 'user', content: question.trim() };
    const history = messages.slice(-10).map(message => ({ role: message.role, content: message.role === 'assistant' ? message.result.summary : message.content }));
    setMessages(previous => [...previous, userMessage]); setIsSending(true); setError(null);
    try {
      const response = await fetch('/api/ads-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: question.trim(), history, snapshot: dataState.snapshot, learningProfile: getLearningProfile(accountId), viewContext }), signal: controller.signal });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? 'Unable to answer this question.');
      const result = payload as AdsChatAnswer;
      if (sendController.current === controller) {
        setMessages(previous => [...previous, { id: crypto.randomUUID(), role: 'assistant', content: result.answer, result }]);
        saveActionSource(accountId, 'chat', result.recommendations.map((item,i) => ({ id: 'chat:' + i, source: 'chat', entityId: item.entityId, entityName: item.entityName, title: item.action, evidence: [item.rationale, ...result.caveats], href: item.href, priority: item.priority, direction: 'review', target: '', updatedAt: dataState.snapshot.collectedAt })));
      }
    } catch (reason) { if (sendController.current === controller) setError(controller.signal.aborted ? 'The AI request timed out. Please send your question again.' : reason instanceof Error ? reason.message : 'Unable to answer this question.'); }
    finally { clearTimeout(timeout); if (sendController.current === controller) { setIsSending(false); busy.current = false; sendController.current = null; } }
  }, [accountId, days, dataState, messages, viewContext]);

  const clear = useCallback(() => { setMessages([]); setError(null); }, []);
  return { dataState, messages, isSending, error, send, clear, reload: load };
}

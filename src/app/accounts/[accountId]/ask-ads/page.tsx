'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useChatScroll } from '@/hooks/useChatScroll';
import { LoadingState } from '@/components/ui/LoadingState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdsChat } from '@/hooks/useAdsChat';
import { PageContainer } from '@/components/layout/PageContainer';
import { ChatWelcome } from '@/components/ai/ChatWelcome';
import { ChatIdentity, ChatThinking } from '@/components/ai/ChatIdentity';
import { ChatDataTable } from '@/components/ai/ChatDataTable';
import { ChatComposer } from '@/components/ai/ChatComposer';
import { ChatEntityLink } from '@/components/ai/ChatEntityLink';
import { getChatEntityHref } from '@/lib/chat-entity-link';

const priorityStyle = {
  high: 'bg-status-red/10 text-status-red',
  medium: 'bg-status-yellow/10 text-status-yellow',
  low: 'bg-accent/10 text-accent',
};

export default function AskAdsPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const { accountId } = useParams<{ accountId: string }>();
  const searchParams = useSearchParams();
  const accountName = searchParams.get('accountName') ?? accountId;
  const currency = searchParams.get('currency') ?? 'USD';
  const [days, setDays] = useState(() => { const value = Number(searchParams.get('days')); return [7,14,30].includes(value) ? value : 14; });
  const [question, setQuestion] = useState(() => searchParams.get('question')?.slice(0, 1500) ?? '');
  const chat = useAdsChat(accountId, accountName, currency, days, auth.token, searchParams.get('channel') === 'floating' ? 'floating' : 'full');
  const scroll = useChatScroll(chat.messages, chat.isSending);
  const [clearOpen, setClearOpen] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (!auth.isLoading && !auth.token) router.replace('/login'); }, [auth.isLoading, auth.token, router]);
  const submit = (event: FormEvent) => { event.preventDefault(); if (!question.trim() || chat.isSending || chat.dataState.status !== 'ready') return; scroll.scrollToLatest(); void chat.send(question); setQuestion(''); };
  const snapshot = chat.dataState.status === 'ready' ? chat.dataState.snapshot : null;
  if (auth.isLoading) return <PageContainer ready={false}><LoadingState /></PageContainer>;

  return (
    <PageContainer className="meta-ai-page" ready={chat.dataState.status !== 'loading'}>
      <h1 className="sr-only">Meta AI</h1>
      <header className="meta-ai-page-heading">
        <div className="meta-ai-page-title"><ChatIdentity /></div>
        <details className="meta-chat-scope-picker meta-ai-page-scope">
          <summary><span>{accountName}</span><span>{days} days <span aria-hidden="true">⌄</span></span></summary>
          <div className="meta-chat-options-content">
            <label className="meta-ai-period-label">Analysis period
              <select value={days} disabled={chat.isSending} onChange={event => { const value = Number(event.target.value); if (value !== days) setDays(value); }}>
                {[7, 14, 30].map(value => <option key={value} value={value}>{value} days</option>)}
              </select>
            </label>
            {snapshot && <>
              <p>{snapshot.period.current.since} – {snapshot.period.current.until}</p>
              <p>Compared with {snapshot.period.previous.since} – {snapshot.period.previous.until}</p>
              <p>{snapshot.coverage.campaignCount} campaigns · {snapshot.coverage.adsetCount} ad sets · {snapshot.coverage.adCount} ads · {snapshot.currency}</p>
              <p>Updated: {new Date(snapshot.collectedAt).toLocaleString('en-US')}</p>
              <p>Sales: ROAS, purchases and CPA. Leads: CPL and volume. Traffic: landing page views and cost per view. Missing metrics are not inferred.</p>
              {snapshot.coverage.notes.map(note => <p key={note}>{note}</p>)}
            </>}
            <div className="meta-chat-option-actions">
              <button type="button" onClick={chat.reload} disabled={chat.dataState.status === 'loading' || chat.isSending}>Refresh data</button>
              <Link href="/accounts">Switch account</Link>
            </div>
          </div>
        </details>
        <button type="button" className="meta-ai-icon-button" aria-label="Start a new conversation" title="New conversation" disabled={!chat.messages.length || chat.isSending} onClick={() => setClearOpen(true)}>
          <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 3l5 5M10 14l1-5 7-7 5 5-7 7-5 1" /></svg>
        </button>
      </header>

      {chat.dataState.status === 'loading' && <ChatThinking message="Preparing your ad data…" />}
      {chat.dataState.status === 'error' && <div className="rounded-xl border border-status-red/30 bg-status-red/10 p-5 text-status-red"><p className="font-bold">Unable to prepare chat data</p><p className="mt-1 text-sm">{chat.dataState.error}</p><button onClick={chat.reload} className="mt-3 rounded-lg border border-status-red/30 px-3 py-2 text-xs font-bold">Try again</button></div>}

      {snapshot && <div className="meta-ai-conversation-layout">
        <section className="meta-ai-conversation" aria-label="Advertising conversation">
          <div className="meta-chat-body">
          <div ref={scroll.container} onScroll={scroll.onScroll} role="log" aria-label="Meta AI conversation" aria-live="polite" data-empty={chat.messages.length === 0} className="full-chat-log meta-chat-log min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
            {chat.messages.length === 0 && <ChatWelcome disabled={chat.isSending} onSelect={text => { setQuestion(text); input.current?.focus(); }} />}

            {chat.messages.map(message => message.role === 'user' ? (
              <article key={message.id} className="meta-chat-message meta-chat-message-user"><span className="sr-only">You</span><p className="meta-chat-text">{message.content}</p></article>
            ) : (
              <article key={message.id} className="meta-chat-message meta-chat-message-assistant">
                <ChatIdentity />
                <p className="meta-chat-text">{message.result.answer}</p>

                {message.result.tables.map((table, tableIndex) => <ChatDataTable key={`${table.title}-${tableIndex}`} table={table} />)}

                {message.result.recommendations.length > 0 && <div className="mt-4"><p className="text-[10px] font-black uppercase text-accent">Recommended actions</p><div className="mt-2 space-y-2">{message.result.recommendations.map((item, index) => <div key={`${item.entityId}-${index}`} className="rounded-lg border border-border bg-bg-card p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${priorityStyle[item.priority]}`}>{item.priority}</span><ChatEntityLink href={getChatEntityHref(snapshot, item.entityId)} arrow className="text-xs font-bold text-accent hover:underline">{getChatEntityHref(snapshot, item.entityId) ? 'Open entity' : 'Entity unavailable'}</ChatEntityLink></div><p className="mt-2 text-sm font-bold text-text-primary">{item.action}</p><p className="mt-1 text-xs text-text-secondary">{item.entityName}: {item.rationale}</p></div>)}</div></div>}

                {message.result.links.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{message.result.links.map((link, index) => <ChatEntityLink key={`${link.entityId}-${index}`} href={getChatEntityHref(snapshot, link.entityId, link.entityType)} title={link.reason} arrow className="rounded-lg border border-accent/25 bg-accent/[0.06] px-3 py-2 text-xs font-bold text-accent hover:bg-accent/10">{link.entityName}</ChatEntityLink>)}</div>}
                {message.result.caveats.length > 0 && <details className="meta-chat-limitations"><summary>Data limitations ({message.result.caveats.length})</summary><ul>{message.result.caveats.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
              </article>
            ))}

            {chat.error && <div className="rounded-lg border border-status-red/30 bg-status-red/10 p-3 text-sm text-status-red">{chat.error}</div>}
          </div>

          {chat.isSending && <div className="meta-chat-loading"><ChatThinking /></div>}
          </div>
          {scroll.hasNew && <button type="button" className="ai-chat-new" onClick={scroll.scrollToLatest}>Latest messages ↓</button>}
          <ChatComposer inputRef={input} value={question} onChange={setQuestion} onSubmit={submit} ready={chat.dataState.status === 'ready'} sending={chat.isSending} />
        </section>
      </div>}
      <ConfirmDialog open={clearOpen} title="Clear conversation?" description="This removes the conversation saved on this device for the selected account and period." confirmLabel="Clear conversation" destructive loading={chat.isSending} onCancel={() => setClearOpen(false)} onConfirm={() => { chat.clear(); setClearOpen(false); }} />
    </PageContainer>
  );
}

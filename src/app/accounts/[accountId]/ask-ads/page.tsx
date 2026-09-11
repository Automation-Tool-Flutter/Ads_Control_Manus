'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useChatScroll } from '@/hooks/useChatScroll';
import { LoadingState } from '@/components/ui/LoadingState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdsChat } from '@/hooks/useAdsChat';
import { PageContainer } from '@/components/layout/PageContainer';
import { ControlHeader } from '@/components/layout/ControlHeader';
import { ChatIdentity, ChatThinking } from '@/components/ai/ChatIdentity';
import { ChatDataTable } from '@/components/ai/ChatDataTable';
import { ChatComposer } from '@/components/ai/ChatComposer';

const SUGGESTIONS = [
  'Which campaigns are wasting the most budget?',
  'Why has performance declined compared with the previous period?',
  'Which ad sets should I review for pausing today?',
  'Which creatives should be replaced first?',
  'Build a seven-day optimization plan.',
];

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

  useEffect(() => { if (!auth.isLoading && !auth.token) router.replace('/login'); }, [auth.isLoading, auth.token, router]);
  const submit = (event: FormEvent) => { event.preventDefault(); if (!question.trim() || chat.isSending || chat.dataState.status !== 'ready') return; scroll.scrollToLatest(); void chat.send(question); setQuestion(''); };
  const snapshot = chat.dataState.status === 'ready' ? chat.dataState.snapshot : null;
  if (auth.isLoading) return <PageContainer ready={false}><LoadingState /></PageContainer>;

  return (
    <PageContainer className="pb-28">
      <ControlHeader
        breadcrumbs={[{ label: 'Accounts', href: '/accounts' }, { label: accountName, href: `/accounts/${accountId}` }, { label: 'Meta AI' }]}
        eyebrow="Conversational analytics"
        title="Meta AI"
        description="Ask about campaign, ad set, and ad performance. Answers compare the previous period and include supporting metrics and links to the relevant entities."
        badge="Meta data + Meta Ads AI"
        stats={snapshot ? [
          { label: 'campaigns', value: snapshot.coverage.campaignCount, tone: 'blue' },
          { label: 'ad sets', value: snapshot.coverage.adsetCount, tone: 'green' },
          { label: 'ads', value: snapshot.coverage.adCount, tone: 'neutral' },
        ] : []}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-text-muted">Analysis period</span>
          {[7, 14, 30].map(value => <button key={value} type="button" aria-pressed={days === value} disabled={chat.isSending} onClick={() => { if (value !== days) { chat.clear(); setDays(value); } }} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${days === value ? 'border-accent bg-accent text-white' : 'border-border bg-bg-card text-text-secondary'}`}>{value} days</button>)}
          <button type="button" onClick={chat.reload} disabled={chat.dataState.status === 'loading' || chat.isSending} className="ml-auto rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs font-bold text-text-secondary disabled:opacity-40">Refresh data</button>
        </div>
      </ControlHeader>

      {chat.dataState.status === 'loading' && <LoadingState message="Preparing your ad data…" />}
      {chat.dataState.status === 'error' && <div className="rounded-xl border border-status-red/30 bg-status-red/10 p-5 text-status-red"><p className="font-bold">Unable to prepare chat data</p><p className="mt-1 text-sm">{chat.dataState.error}</p><button onClick={chat.reload} className="mt-3 rounded-lg border border-status-red/30 px-3 py-2 text-xs font-bold">Try again</button></div>}

      {snapshot && <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="flex min-h-[65vh] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-bg-card">
          <div className="border-b border-border bg-bg-secondary/50 px-4 py-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold text-text-primary">Analysis conversation</p><p className="text-[11px] text-text-muted">{snapshot.period.current.since} → {snapshot.period.current.until} compared with {snapshot.period.previous.since} → {snapshot.period.previous.until}</p></div>{chat.messages.length > 0 && <button type="button" onClick={() => setClearOpen(true)} disabled={chat.isSending} className="text-xs font-bold text-text-muted hover:text-status-red">Clear conversation</button>}</div></div>

          <div className="meta-chat-body">
          <div ref={scroll.container} onScroll={scroll.onScroll} role="log" aria-label="Meta AI conversation" aria-live="polite" className="full-chat-log meta-chat-log min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
            {chat.messages.length === 0 && <div className="py-8 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-xl text-accent">✦</div><h2 className="mt-3 text-lg font-bold text-text-primary">What would you like to understand?</h2><p className="mx-auto mt-1 max-w-xl text-sm text-text-secondary">AI uses the Meta data loaded for this analysis. Ask about performance, changes, budget allocation, or your next actions.</p><div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">{SUGGESTIONS.map(item => <button key={item} type="button" disabled={chat.isSending} onClick={() => { if (!chat.isSending) { scroll.scrollToLatest(); setQuestion(''); void chat.send(item); } }} className="rounded-full border border-border bg-bg-secondary/50 px-3 py-2 text-xs font-semibold text-text-secondary hover:border-accent/40 hover:text-accent">{item}</button>)}</div></div>}

            {chat.messages.map(message => message.role === 'user' ? (
              <article key={message.id} className="meta-chat-message meta-chat-message-user"><span className="sr-only">You</span><p className="meta-chat-text">{message.content}</p></article>
            ) : (
              <article key={message.id} className="meta-chat-message meta-chat-message-assistant">
                <ChatIdentity />
                <p className="meta-chat-text">{message.result.answer}</p>

                {message.result.tables.map((table, tableIndex) => <ChatDataTable key={`${table.title}-${tableIndex}`} table={table} />)}

                {message.result.recommendations.length > 0 && <div className="mt-4"><p className="text-[10px] font-black uppercase text-accent">Recommended actions</p><div className="mt-2 space-y-2">{message.result.recommendations.map((item, index) => <div key={`${item.entityId}-${index}`} className="rounded-lg border border-border bg-bg-card p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${priorityStyle[item.priority]}`}>{item.priority}</span>{item.href && <Link href={item.href} className="text-xs font-bold text-accent hover:underline">Open entity →</Link>}</div><p className="mt-2 text-sm font-bold text-text-primary">{item.action}</p><p className="mt-1 text-xs text-text-secondary">{item.entityName}: {item.rationale}</p></div>)}</div></div>}

                {message.result.links.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{message.result.links.map((link, index) => <Link key={`${link.entityId}-${index}`} href={link.href} title={link.reason} className="rounded-lg border border-accent/25 bg-accent/[0.06] px-3 py-2 text-xs font-bold text-accent hover:bg-accent/10">{link.entityName} ↗</Link>)}</div>}
                {message.result.caveats.length > 0 && <details className="meta-chat-limitations"><summary>Data limitations ({message.result.caveats.length})</summary><ul>{message.result.caveats.map((item, index) => <li key={index}>{item}</li>)}</ul></details>}
              </article>
            ))}

            {chat.error && <div className="rounded-lg border border-status-red/30 bg-status-red/10 p-3 text-sm text-status-red">{chat.error}</div>}
          </div>

          {chat.isSending && <div className="meta-chat-loading"><ChatThinking /></div>}
          </div>
          {scroll.hasNew && <button type="button" className="ai-chat-new" onClick={scroll.scrollToLatest}>Latest messages ↓</button>}
          <ChatComposer value={question} onChange={setQuestion} onSubmit={submit} ready={chat.dataState.status === 'ready'} sending={chat.isSending} />
        </section>

        <aside className="h-fit space-y-3 xl:sticky xl:top-4"><div className="rounded-xl border border-border bg-bg-card p-4"><p className="text-[10px] font-black uppercase text-accent">Data context</p><h2 className="mt-1 font-bold text-text-primary">Analysis coverage</h2><div className="mt-3 space-y-2 text-xs text-text-secondary"><div className="flex justify-between"><span>Campaign</span><strong>{snapshot.campaigns.length}</strong></div><div className="flex justify-between"><span>Ad sets with delivery</span><strong>{snapshot.adsets.length}</strong></div><div className="flex justify-between"><span>Ads with delivery</span><strong>{snapshot.ads.length}</strong></div><div className="flex justify-between"><span>Currency</span><strong>{snapshot.currency}</strong></div></div><p className="mt-3 text-[10px] text-text-muted">Updated: {new Date(snapshot.collectedAt).toLocaleString('en-US')}</p></div><div className="rounded-xl border border-status-yellow/25 bg-status-yellow/[0.06] p-4"><p className="text-xs font-bold text-status-yellow">Analysis principles</p><ul className="mt-2 space-y-1.5 text-xs text-text-secondary"><li>• Sales prioritizes ROAS, purchases, and CPA.</li><li>• Leads prioritizes CPL and lead volume.</li><li>• Traffic prioritizes landing page views and cost per view.</li><li>• Missing Meta metrics are not inferred.</li></ul></div>{snapshot.coverage.notes.map(note => <p key={note} className="px-1 text-[10px] leading-relaxed text-text-muted">{note}</p>)}</aside>
      </div>}
      <ConfirmDialog open={clearOpen} title="Clear conversation?" description="This removes the conversation saved on this device for the selected account and period." confirmLabel="Clear conversation" destructive loading={chat.isSending} onCancel={() => setClearOpen(false)} onConfirm={() => { chat.clear(); setClearOpen(false); }} />
    </PageContainer>
  );
}

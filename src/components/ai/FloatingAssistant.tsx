'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { ChatIdentity, ChatThinking } from './ChatIdentity';
import { ChatDataTable } from './ChatDataTable';
import { ChatComposer } from './ChatComposer';
import { useChatScroll } from '@/hooks/useChatScroll';
import { LoadingState } from '@/components/ui/LoadingState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdAccounts } from '@/hooks/useAdAccounts';
import { useAdsChat } from '@/hooks/useAdsChat';
import { useAIViewContext } from '@/hooks/useAIViewContext';
import { resolveViewContext } from '@/lib/ai-view-context';
import type { AdAccount } from '@/lib/types';
import { useMobileDialog } from '@/hooks/useMobileDialog';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';

export function FloatingAssistant() {
  const { state } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { present, closing } = useOverlayPresence(open);
  const [visited, setVisited] = useState(false);
  const [docked, setDocked] = useState(false);
  useEffect(() => { if (pathname.endsWith('/ask-ads')) setOpen(false); }, [pathname]);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useMobileDialog(present, panel);
  const show = () => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setVisited(true); setOpen(true); };
  const close = () => setOpen(false);
  useEffect(() => {
    if (!present) return;
    return () => {
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
      else trigger.current?.focus({ preventScroll: true });
    };
  }, [present]);
  useEffect(() => {
    const handleOpen = () => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setVisited(true); setOpen(true); };
    window.addEventListener('open-ai-assistant', handleOpen);
    return () => window.removeEventListener('open-ai-assistant', handleOpen);
  }, []);
  useEffect(() => { if (open) panel.current?.focus({ preventScroll: true }); }, [open]);
  if (state.isLoading) return null;
  return <div className="ai-floating-root" data-authenticated={Boolean(state.user)} data-open={present} data-closing={closing} data-docked={present && docked ? 'true' : 'false'}>
    <section ref={panel} id="floating-ai-panel" role="dialog" aria-label="AI analysis assistant" tabIndex={-1} hidden={!present} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }} className="ai-floating-panel">
      <div className="ai-floating-heading"><div className="flex items-center gap-3"><BrandLogo size={36} decorative /><div><h2 className="text-sm font-bold">Meta AI</h2><p className="mt-1 text-[11px] text-indigo-200">Analysis assistant · Meta Ads AI</p></div></div><div className="flex gap-2"><button onClick={() => setDocked(value => !value)} aria-label={docked ? "Float AI panel" : "Dock AI panel"} className="hidden rounded-xl border border-white/20 px-3 text-[11px] min-[1600px]:block">{docked ? "Float" : "Dock"}</button><button onClick={close} aria-label="Minimize AI chat" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-xl">−</button></div></div>
      {visited && (state.token ? <AccountChat key={state.user?.id ?? 'session'} token={state.token} /> : <div className="p-6"><h3 className="text-lg font-bold text-text-primary">Analyze with AI, right here.</h3><p className="mt-3 text-sm leading-6 text-text-secondary">Connect Meta to explore campaigns, compare performance, and receive recommendations grounded in your account data.</p><Link onClick={close} href="/login" className="ai-primary-button mt-5">Connect an account →</Link></div>)}
    </section>
    <button ref={trigger} aria-label={open ? 'Minimize Meta AI' : 'Open Meta AI'} aria-expanded={open} aria-controls="floating-ai-panel" onClick={open ? close : show} className="ai-floating-trigger"><BrandLogo size={28} decorative /><span>Meta AI</span><span className="h-1.5 w-1.5 rounded-full bg-indigo-200" /></button>
  </div>;
}

function AccountChat({ token }: { token: string }) {
  const pathname = usePathname();
  const routeAccount = pathname.startsWith('/accounts/') ? pathname.split('/')[2] : '';
  const { state, retry } = useAdAccounts(token);
  const [selected, setSelected] = useState('');
  const [days, setDays] = useState(14);
  // Following a new account route always changes the visible analysis scope.
  useEffect(() => { if (routeAccount) setSelected(routeAccount); }, [routeAccount]);
  const selectedId = routeAccount || selected;
  const accounts = state.status === 'success' ? state.data : [];
  const account = accounts.find(item => item.id === selectedId);
  if (pathname.endsWith('/ask-ads')) return <div className="p-6 text-sm leading-6 text-text-secondary">Continue in the full conversation. Meta AI will remain available when you navigate elsewhere.</div>;
  return <div className="flex min-h-0 flex-1 flex-col">
    <details className="meta-chat-scope-picker">
      <summary><span>{account?.name || 'Choose an account'}</span><span>{days} days <span aria-hidden="true">⌄</span></span></summary>
      <div className="meta-chat-scope-fields">
        <label htmlFor="copilot-account">Ad account<select id="copilot-account" disabled={Boolean(routeAccount) || state.status !== 'success'} value={selectedId} onChange={e => setSelected(e.target.value)}><option value="">Select an ad account</option>{accounts.map(item => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}</select></label>
        <label>Period<select value={days} onChange={e => setDays(Number(e.target.value))}>{[7,14,30].map(value => <option key={value} value={value}>{value} days</option>)}</select></label>
        <p>{routeAccount ? 'Following the account on this page.' : 'Only the selected account’s advertising data is included.'}</p>
      </div>
    </details>
    {state.status === 'error' ? <div role="alert" className="p-5 text-sm text-status-red">{state.error}<button onClick={retry} className="mt-3 block underline">Try again</button></div> : state.status !== 'success' ? <LoadingState placement="panel" message="Loading accounts…" /> : account ? <ChatSession key={`${account.id}:${days}`} account={account} days={days} token={token} /> : <div className="p-6"><p className="text-sm leading-6 text-text-secondary">{routeAccount ? 'This account is not available in your current access list.' : accounts.length ? 'Choose an account above. AI will analyze real metrics and compare the previous period.' : 'No ad accounts were found in your Meta connection.'}</p><Link href="/accounts" className="mt-4 inline-block text-xs font-bold text-accent">Open Meta Ads AI →</Link></div>}
  </div>;
}

function ChatSession({ account, days, token }: { account: AdAccount; days: number; token: string }) {
  const chat = useAdsChat(account.id, account.name, account.currency, days, token, 'floating');
  const [question, setQuestion] = useState('');
  const scroll = useChatScroll(chat.messages, chat.isSending);
  const [clearOpen, setClearOpen] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const ready = chat.dataState.status === 'ready';
  const view = useAIViewContext();
  const context = chat.dataState.status === 'ready' ? resolveViewContext(chat.dataState.snapshot, view) : null;
  const base = `/accounts/${account.id}/`;
  const full = `${base}ask-ads?accountName=${encodeURIComponent(account.name)}&currency=${account.currency}&days=${days}&channel=floating`;
  // Only navigate to account-local entities supplied by the existing analysis endpoint.
  const localHref = (href: string) => href.startsWith(base) && !href.includes('\\') ? href : full;
  return <>
    <details className="meta-chat-options">
      <summary><span>{ready ? 'Analysis details' : 'Preparing account data'}</span><span aria-hidden="true">•••</span></summary>
      <div className="meta-chat-options-content">
        {chat.dataState.status === 'ready' && <p>{chat.dataState.snapshot.coverage.campaignCount} campaigns · Comparing two periods</p>}
        {context && <><p>Context: {context.entities.map(item => item.name).join(', ') || (context.missingIds.length ? 'Entity not included in this snapshot' : 'Account')}</p>{view.dateLabel && <p>Page filter: {view.dateLabel} · Chat period: {days} days</p>}{context.missingIds.length > 0 && <p className="text-status-yellow">Missing {context.missingIds.length} entities in the AI snapshot.</p>}<Link href={`${base}actions`}>Open Action Center ↗</Link></>}
        <div className="meta-chat-option-actions"><button disabled={chat.isSending || !ready} onClick={chat.reload}>Refresh data</button><button disabled={chat.isSending} onClick={() => setClearOpen(true)}>Clear chat</button><Link href={full}>Full conversation ↗</Link></div>
      </div>
    </details>
    <div className="meta-chat-body">
    <div ref={scroll.container} onScroll={scroll.onScroll} role="log" aria-label="Meta AI conversation" aria-live="polite" className="meta-chat-log min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
      {chat.dataState.status === 'error' && <div role="alert" className="rounded-xl bg-status-red/10 p-3 text-xs text-status-red">{chat.dataState.error}<button onClick={chat.reload} className="mt-2 block underline">Reload data</button></div>}
      {ready && !chat.messages.length && <div className="py-3"><span className="text-3xl text-accent" aria-hidden="true">✦</span><h3 className="mt-3 text-lg font-bold text-text-primary">Ask a question. Find your next move.</h3><p className="mt-2 text-xs leading-5 text-text-secondary">AI analyzes metrics and suggests next steps. It does not automatically change budgets or delivery status.</p><div className="mt-4 space-y-2">{['Which campaigns should I prioritize for optimization?', 'Why did performance decline compared with the previous period?', 'Recommend a seven-day optimization plan.'].map(text => <button key={text} onClick={() => { setQuestion(text); input.current?.focus(); }} className="block w-full rounded-xl border border-border px-3 py-2.5 text-left text-xs text-text-secondary hover:border-accent/50">{text} ↗</button>)}</div></div>}
      {chat.messages.map(message => <article key={message.id} className={'meta-chat-message meta-chat-message-' + message.role}>{message.role === 'user' ? <span className="sr-only">You</span> : <ChatIdentity />}<p className="meta-chat-text">{message.content}</p>{message.role === 'assistant' && <>
        {message.result.tables.map((table, i) => <ChatDataTable key={i} table={table} />)}
        {message.result.recommendations.map((item, i) => <Link key={i} href={localHref(item.href)} className="mt-3 block rounded-xl bg-accent/5 p-3 text-xs text-text-primary"><span className="font-bold">{item.action} →</span><span className="mt-1 block leading-5 text-text-secondary">{item.rationale}</span></Link>)}
        {message.result.links.map((item, i) => <Link key={i} href={localHref(item.href)} className="mt-2 block text-xs font-semibold text-accent">{item.entityName} ↗</Link>)}
        {message.result.caveats.length > 0 && <details className="meta-chat-limitations"><summary>Data limitations ({message.result.caveats.length})</summary><ul>{message.result.caveats.map((text, i) => <li key={i}>{text}</li>)}</ul></details>}
      </>}</article>)}

      {chat.error && <div role="alert" className="rounded-xl bg-status-red/10 p-3 text-xs text-status-red"><p>{chat.error}</p><button type="button" disabled={chat.isSending} className="mt-2 underline" onClick={() => { const last = [...chat.messages].reverse().find(item => item.role === 'user'); if (last) { setQuestion(last.content); input.current?.focus(); } }}>Edit last question</button></div>}
    </div>
    {chat.dataState.status === 'loading' && <div className="meta-chat-loading"><LoadingState placement="panel" message="Preparing your ad data…" /></div>}
    {chat.isSending && <div className="meta-chat-loading"><ChatThinking /></div>}
    </div>
    <ConfirmDialog open={clearOpen} title="Clear conversation?" description="This removes the conversation saved on this device for the selected account and period." confirmLabel="Clear conversation" destructive loading={chat.isSending} onCancel={() => setClearOpen(false)} onConfirm={() => { chat.clear(); setClearOpen(false); }} />
    {scroll.hasNew && <button type="button" className="ai-chat-new" onClick={scroll.scrollToLatest}>Latest messages ↓</button>}
    <ChatComposer inputRef={input} value={question} onChange={setQuestion} ready={ready} sending={chat.isSending} onSubmit={() => { scroll.scrollToLatest(); void chat.send(question); setQuestion(''); }} />
  </>;
}

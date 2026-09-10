'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useChatScroll } from '@/hooks/useChatScroll';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAdAccounts } from '@/hooks/useAdAccounts';
import { useAdsChat } from '@/hooks/useAdsChat';
import { useAIViewContext } from '@/hooks/useAIViewContext';
import { resolveViewContext } from '@/lib/ai-view-context';
import type { AdAccount } from '@/lib/types';
import { useMobileDialog } from '@/hooks/useMobileDialog';

export function FloatingAssistant() {
  const { state } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const [docked, setDocked] = useState(false);
  useEffect(() => { if (pathname.endsWith('/ask-ads')) setOpen(false); }, [pathname]);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useMobileDialog(open, panel);
  const show = () => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setVisited(true); setOpen(true); };
  const close = () => { setOpen(false); requestAnimationFrame(() => { if (opener.current?.isConnected) opener.current.focus(); else trigger.current?.focus(); }); };
  useEffect(() => {
    const handleOpen = () => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setVisited(true); setOpen(true); };
    window.addEventListener('open-ai-assistant', handleOpen);
    return () => window.removeEventListener('open-ai-assistant', handleOpen);
  }, []);
  useEffect(() => { if (open) panel.current?.focus(); }, [open]);
  if (state.isLoading) return null;
  return <div className="ai-floating-root" data-authenticated={Boolean(state.user)} data-open={open} data-docked={open && docked ? 'true' : 'false'}>
    <section ref={panel} id="floating-ai-panel" role="dialog" aria-label="AI analysis assistant" tabIndex={-1} hidden={!open} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }} className="ai-floating-panel">
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
  if (pathname.endsWith('/ask-ads')) return <div className="p-6 text-sm leading-6 text-text-secondary">You are in Ask your Ads. Continue in the full conversation; Copilot will remain available when you navigate elsewhere.</div>;
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="ai-chat-scope space-y-2 border-b border-border bg-bg-secondary/40 p-3">
      <label htmlFor="copilot-account" className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Advertising data scope</label>
      <div className="flex gap-2"><select id="copilot-account" disabled={Boolean(routeAccount) || state.status !== 'success'} value={selectedId} onChange={e => setSelected(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-border bg-bg-card px-3 py-2 text-xs text-text-primary"><option value="">Select an ad account</option>{accounts.map(item => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}</select><select aria-label="Chat analysis period" value={days} onChange={e => setDays(Number(e.target.value))} className="rounded-xl border border-border bg-bg-card px-2 py-2 text-xs text-text-primary">{[7,14,30].map(value => <option key={value} value={value}>{value} days</option>)}</select></div>
      <p className="text-[10px] leading-4 text-text-muted">{routeAccount ? 'Following the account on the current page.' : 'Choose an account to analyze. Page content and open forms are not automatically included.'}</p>
    </div>
    {state.status === 'error' ? <div role="alert" className="p-5 text-sm text-status-red">{state.error}<button onClick={retry} className="mt-3 block underline">Try again</button></div> : state.status !== 'success' ? <p className="p-6 text-sm text-text-muted">Loading accounts…</p> : account ? <ChatSession key={`${account.id}:${days}`} account={account} days={days} token={token} /> : <div className="p-6"><p className="text-sm leading-6 text-text-secondary">{routeAccount ? 'This account is not available in your current access list.' : accounts.length ? 'Choose an account above. AI will analyze real metrics and compare the previous period.' : 'No ad accounts were found in your Meta connection.'}</p><Link href="/accounts" className="mt-4 inline-block text-xs font-bold text-accent">Open Meta Ads AI →</Link></div>}
  </div>;
}

function ChatSession({ account, days, token }: { account: AdAccount; days: number; token: string }) {
  const chat = useAdsChat(account.id, account.name, account.currency, days, token, 'floating');
  const [question, setQuestion] = useState('');
  const scroll = useChatScroll(chat.messages, chat.isSending);
  const [clearOpen, setClearOpen] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const node = input.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = Math.min(node.scrollHeight, 140) + 'px';
  }, [question]);
  const ready = chat.dataState.status === 'ready';
  const view = useAIViewContext();
  const context = chat.dataState.status === 'ready' ? resolveViewContext(chat.dataState.snapshot, view) : null;
  const base = `/accounts/${account.id}/`;
  const full = `${base}ask-ads?accountName=${encodeURIComponent(account.name)}&currency=${account.currency}&days=${days}&channel=floating`;
  // Only navigate to account-local entities supplied by the existing analysis endpoint.
  const localHref = (href: string) => href.startsWith(base) && !href.includes('\\') ? href : full;
  return <>
    {context && <div className="ai-chat-context border-b border-border bg-accent/5 px-3 py-2 text-[10px] leading-5 text-text-secondary"><p>In context: {context.entities.map(item => item.name).join(', ') || (context.missingIds.length ? 'Entity not included in this snapshot' : 'Account')}</p>{view.dateLabel && <p>Page filter: {view.dateLabel} · Chat period: {days} days</p>}{context.missingIds.length > 0 && <p className="text-status-yellow">Missing {context.missingIds.length} entities in the AI snapshot.</p>}<Link className="font-bold text-accent" href={`${base}actions`}>Open Action Center →</Link></div>}
    <div className="ai-chat-toolbar flex items-center justify-between border-b border-border px-3 py-2 text-[10px] text-text-muted"><span>{chat.dataState.status === 'ready' ? `${chat.dataState.snapshot.coverage.campaignCount} campaigns · two-period comparison` : 'Preparing data'}</span><div className="flex gap-3"><button disabled={chat.isSending || !ready} onClick={chat.reload} className="disabled:opacity-40">Refresh</button><button disabled={chat.isSending} onClick={() => setClearOpen(true)} className="disabled:opacity-40">Clear chat</button><Link className="font-bold text-accent" href={full}>Full conversation ↗</Link></div></div>
    <div ref={scroll.container} onScroll={scroll.onScroll} role="log" aria-label="AI conversation" aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
      {chat.dataState.status === 'loading' && <p className="text-xs leading-5 text-text-muted">Loading campaigns, ad sets, and ads. No AI request has been sent.</p>}
      {chat.dataState.status === 'error' && <div role="alert" className="rounded-xl bg-status-red/10 p-3 text-xs text-status-red">{chat.dataState.error}<button onClick={chat.reload} className="mt-2 block underline">Reload data</button></div>}
      {!chat.messages.length && <div className="py-3"><span className="text-3xl text-accent" aria-hidden="true">✦</span><h3 className="mt-3 text-lg font-bold text-text-primary">Ask a question. Find your next move.</h3><p className="mt-2 text-xs leading-5 text-text-secondary">AI analyzes metrics and suggests next steps. It does not automatically change budgets or delivery status.</p><div className="mt-4 space-y-2">{['Which campaigns should I prioritize for optimization?', 'Why did performance decline compared with the previous period?', 'Recommend a seven-day optimization plan.'].map(text => <button key={text} onClick={() => { setQuestion(text); input.current?.focus(); }} className="block w-full rounded-xl border border-border px-3 py-2.5 text-left text-xs text-text-secondary hover:border-accent/50">{text} ↗</button>)}</div></div>}
      {chat.messages.map(message => <article key={message.id} className={message.role === 'user' ? 'ml-6 rounded-2xl rounded-br-sm bg-accent/10 p-3' : 'rounded-2xl border border-border bg-bg-card p-3'}><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-accent">{message.role === 'user' ? 'You' : '✦ AI Copilot'}</p><p className="whitespace-pre-wrap break-words text-xs leading-6 text-text-primary">{message.content}</p>{message.role === 'assistant' && <>
        {message.result.tables.map((table, i) => <div key={i} className="mt-3 overflow-x-auto"><p className="mb-2 text-xs font-bold text-text-primary">{table.title}</p><table className="w-full text-left text-[10px] text-text-secondary"><thead><tr>{table.columns.map((column, j) => <th key={j} className="border-b border-border p-2">{column}</th>)}</tr></thead><tbody>{table.rows.map((row, j) => <tr key={j}>{row.cells.map((cell, k) => <td key={k} className="border-b border-border/50 p-2">{cell}</td>)}</tr>)}</tbody></table></div>)}
        {message.result.recommendations.map((item, i) => <Link key={i} href={localHref(item.href)} className="mt-3 block rounded-xl bg-accent/5 p-3 text-xs text-text-primary"><span className="font-bold">{item.action} →</span><span className="mt-1 block leading-5 text-text-secondary">{item.rationale}</span></Link>)}
        {message.result.links.map((item, i) => <Link key={i} href={localHref(item.href)} className="mt-2 block text-xs font-semibold text-accent">{item.entityName} ↗</Link>)}
        {message.result.caveats.map((text, i) => <p key={i} className="mt-2 text-[10px] leading-5 text-text-muted">{text}</p>)}
      </>}</article>)}
      {chat.isSending && <p role="status" className="animate-pulse text-xs text-accent">✦ AI is analyzing your data…</p>}
      {chat.error && <div role="alert" className="rounded-xl bg-status-red/10 p-3 text-xs text-status-red"><p>{chat.error}</p><button type="button" disabled={chat.isSending} className="mt-2 underline" onClick={() => { const last = [...chat.messages].reverse().find(item => item.role === 'user'); if (last) { setQuestion(last.content); input.current?.focus(); } }}>Edit last question</button></div>}
    </div>
    <ConfirmDialog open={clearOpen} title="Clear conversation?" description="This removes the conversation saved on this device for the selected account and period." confirmLabel="Clear conversation" destructive loading={chat.isSending} onCancel={() => setClearOpen(false)} onConfirm={() => { chat.clear(); setClearOpen(false); }} />
    {scroll.hasNew && <button type="button" className="ai-chat-new" onClick={scroll.scrollToLatest}>Latest messages ↓</button>}
    <form onSubmit={e => { e.preventDefault(); if (!ready || chat.isSending || !question.trim()) return; scroll.scrollToLatest(); void chat.send(question); setQuestion(''); }} className="border-t border-border p-3"><div className="flex items-end gap-2 rounded-2xl border border-border bg-bg-secondary/30 p-2"><textarea ref={input} aria-label="Enter your AI question" rows={2} maxLength={1500} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask about your advertising data…" className="min-w-0 flex-1 resize-none rounded-lg bg-transparent p-1 text-sm text-text-primary focus:outline-none" /><button disabled={!ready || chat.isSending || !question.trim()} className="ai-primary-button disabled:opacity-40" aria-label="Send AI question">↑</button></div><p className="mt-2 text-center text-[9px] text-text-muted">Review recommendations before applying · History is stored in this browser</p></form>
  </>;
}

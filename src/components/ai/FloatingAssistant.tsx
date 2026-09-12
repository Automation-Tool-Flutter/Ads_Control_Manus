'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { ChatIdentity, ChatThinking } from './ChatIdentity';
import { ChatDataTable } from './ChatDataTable';
import { ChatComposer } from './ChatComposer';
import { ChatWelcome } from './ChatWelcome';
import { ChatAccountSheet } from './ChatAccountSheet';
import { ChatEntityLink } from './ChatEntityLink';
import { getChatEntityHref } from '@/lib/chat-entity-link';
import { readViewMemory, writeViewMemory } from '@/lib/view-memory';
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
import { useOverlayPresence } from '@/hooks/useOverlayPresence';

export function FloatingAssistant() {
  const { state } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { present, closing } = useOverlayPresence(open);
  const [visited, setVisited] = useState(false);
  const [docked, setDocked] = useState(false);
  const available = pathname !== '/login' && !state.isLoading;
  useEffect(() => { if (pathname.endsWith('/ask-ads') || !available) setOpen(false); }, [pathname, available]);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useMobileDialog(present && available, panel);
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
  if (!available) return null;
  return <div className="ai-floating-root" data-authenticated={Boolean(state.user)} data-open={present} data-closing={closing} data-docked={present && docked ? 'true' : 'false'}>
    <section ref={panel} id="floating-ai-panel" role="dialog" aria-label="AI analysis assistant" tabIndex={-1} hidden={!present} onClickCapture={event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!link || link.hasAttribute('download') || (link.getAttribute('target') && link.getAttribute('target') !== '_self')) return;
      const href = link.getAttribute('href');
      // Reveal the destination even when only the adId query changes on this page.
      if (href?.startsWith('/') && !href.startsWith('//')) close();
    }} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }} className="ai-floating-panel">
      <div className="ai-floating-heading meta-ai-chat-heading">
        <div className="meta-ai-heading-brand"><BrandLogo size={30} decorative /><div><h2>Meta AI</h2><p>Meta Ads AI</p></div></div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setDocked(value => !value)} aria-label={docked ? 'Float AI panel' : 'Dock AI panel'} className="meta-ai-dock hidden min-[1600px]:block">{docked ? 'Float' : 'Dock'}</button>
          <button type="button" onClick={close} aria-label="Close Meta AI chat" className="meta-ai-icon-button"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 6 12 12M6 18 18 6" /></svg></button>
        </div>
      </div>
      {visited && (state.token ? <AccountChat key={state.user?.id ?? 'session'} token={state.token} userId={state.user?.id ?? ''} active={open} /> : <div className="p-6"><h3 className="text-lg font-bold text-text-primary">Analyze with AI, right here.</h3><p className="mt-3 text-sm leading-6 text-text-secondary">Connect Meta to explore campaigns, compare performance, and receive recommendations grounded in your account data.</p><Link onClick={close} href="/login" className="ai-primary-button mt-5">Connect an account →</Link></div>)}
    </section>
    <button ref={trigger} aria-label={open ? 'Minimize Meta AI' : 'Open Meta AI'} aria-expanded={open} aria-controls="floating-ai-panel" onClick={open ? close : show} className="ai-floating-trigger"><BrandLogo size={28} decorative /><span>Meta AI</span><span className="h-1.5 w-1.5 rounded-full bg-indigo-200" /></button>
  </div>;
}

function AccountChat({ token, userId, active }: { token: string; userId: string; active: boolean }) {
  const pathname = usePathname();
  const routeAccount = pathname.startsWith('/accounts/') ? pathname.split('/')[2] : '';
  const { state, retry } = useAdAccounts(token);
  const memoryKey = 'meta-ai-scope:' + userId;
  const [selected, setSelected] = useState(() => readViewMemory(memoryKey, { accountId: '', days: 14 }).accountId);
  const [days, setDays] = useState(() => readViewMemory(memoryKey, { accountId: '', days: 14 }).days);
  const [question, setQuestion] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSession, setPickerSession] = useState(0);
  const accountButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (routeAccount) setSelected(routeAccount); }, [routeAccount]);
  useEffect(() => { if (!active) setPickerOpen(false); }, [active]);
  useEffect(() => { setPickerOpen(false); }, [pathname]);
  const selectedId = routeAccount || selected;
  const accounts = state.status === 'success' ? state.data : [];
  const account = accounts.find(item => item.id === selectedId);
  const chooseAccount = () => { setPickerSession(value => value + 1); setPickerOpen(true); };
  const applyScope = (accountId: string, period: number) => {
    setSelected(accountId);
    setDays(period);
    writeViewMemory(memoryKey, { accountId, days: period });
    setPickerOpen(false);
    requestAnimationFrame(() => accountButton.current?.focus({ preventScroll: true }));
  };
  if (pathname.endsWith('/ask-ads')) return <div className="p-6 text-sm leading-6 text-text-secondary">Continue in the full conversation. Meta AI will remain available when you navigate elsewhere.</div>;
  return <div className="meta-ai-app-flow">
    {state.status === 'error' ? <div className="meta-ai-setup-recovery" role="alert">
      <BrandLogo size={48} decorative /><h3>Let’s reconnect your accounts</h3>
      <p>We couldn’t load your ad accounts. Try again to continue.</p>
      <details><summary>Error details</summary><p>{state.error}</p></details>
      <button type="button" className="meta-ai-start-button" onClick={retry}>Try again</button>
    </div> : state.status !== 'success' ? <ChatThinking message="Getting your accounts ready…" /> : account ? <>
      <button ref={accountButton} type="button" onClick={chooseAccount} className="meta-ai-active-account" aria-label={`${account.name}, ${account.currency}, ${days} days. Change chat account or period`} aria-haspopup="dialog" aria-expanded={pickerOpen}>
        <span className="meta-ai-account-avatar" aria-hidden="true">{account.name?.trim().charAt(0).toUpperCase() || 'A'}</span>
        <span className="meta-ai-account-copy"><strong title={account.name}>{account.name}</strong><small>Ad account · {account.currency}</small></span>
        <span className="meta-ai-period-chip"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18" /></svg>{days} days</span>
        <span className="meta-ai-scope-edit" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m7 10 5 5 5-5" /></svg></span>
      </button>
      <ChatSession key={`${account.id}:${days}`} account={account} days={days} token={token} question={question} setQuestion={setQuestion} />
    </> : accounts.length && !routeAccount ? <>
      <div className="meta-ai-setup-content"><ChatWelcome onSelect={prompt => { setQuestion(prompt); chooseAccount(); }} /></div>
      <footer className="meta-ai-setup-footer">
        <button type="button" className="meta-ai-start-button" onClick={chooseAccount} aria-haspopup="dialog" aria-expanded={pickerOpen}>Choose ad account<span aria-hidden="true">→</span></button>
        <p>{question ? 'Your question is ready. Choose an account to continue.' : `${accounts.length} connected ${accounts.length === 1 ? 'account' : 'accounts'} · Choose where to start`}</p>
      </footer>
    </> : <div className="meta-ai-setup-recovery">
      <BrandLogo size={48} decorative /><h3>{routeAccount ? 'This account is unavailable' : 'Connect your first ad account'}</h3>
      <p>{routeAccount ? 'This account is not in your current access list. Open your accounts to choose an available one.' : 'Your Facebook connection does not have any ad accounts available yet.'}</p>
      <Link href="/accounts" className="meta-ai-start-button">View ad accounts<span aria-hidden="true">→</span></Link>
      <button type="button" className="meta-ai-retry-link" onClick={retry}>Refresh accounts</button>
    </div>}
    <ChatAccountSheet key={pickerSession} open={pickerOpen && active} accounts={accounts} selectedId={account?.id ?? ''} days={days} lockedId={routeAccount || undefined} onApply={applyScope} onClose={() => setPickerOpen(false)} />
  </div>;
}

function ChatSession({ account, days, token, question, setQuestion }: { account: AdAccount; days: number; token: string; question: string; setQuestion: (value: string) => void }) {
  const chat = useAdsChat(account.id, account.name, account.currency, days, token, 'floating');
  const scroll = useChatScroll(chat.messages, chat.isSending);
  const [clearOpen, setClearOpen] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const ready = chat.dataState.status === 'ready';
  const view = useAIViewContext();
  const context = chat.dataState.status === 'ready' ? resolveViewContext(chat.dataState.snapshot, view) : null;
  const base = `/accounts/${account.id}/`;
  const full = `${base}ask-ads?accountName=${encodeURIComponent(account.name)}&currency=${account.currency}&days=${days}&channel=floating`;
  const snapshot = chat.dataState.status === 'ready' ? chat.dataState.snapshot : null;
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
    <div ref={scroll.container} onScroll={scroll.onScroll} role="log" aria-label="Meta AI conversation" aria-live="polite" data-empty={ready && !chat.messages.length} className="meta-chat-log min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
      {chat.dataState.status === 'error' && <div role="alert" className="rounded-xl bg-status-red/10 p-3 text-xs text-status-red">{chat.dataState.error}<button onClick={chat.reload} className="mt-2 block underline">Reload data</button></div>}
      {ready && !chat.messages.length && <ChatWelcome disabled={chat.isSending} onSelect={text => { setQuestion(text); input.current?.focus(); }} />}
      {chat.messages.map(message => <article key={message.id} className={'meta-chat-message meta-chat-message-' + message.role}>{message.role === 'user' ? <span className="sr-only">You</span> : <ChatIdentity />}<p className="meta-chat-text">{message.content}</p>{message.role === 'assistant' && <>
        {message.result.tables.map((table, i) => <ChatDataTable key={i} table={table} />)}
        {message.result.recommendations.map((item, i) => {
          const href = getChatEntityHref(snapshot, item.entityId);
          return <ChatEntityLink key={i} href={href} className="mt-3 block rounded-xl bg-accent/5 p-3 text-xs text-text-primary"><span className="font-bold">{item.action}{href && ' →'}</span><span className="mt-1 block leading-5 text-text-secondary">{item.rationale}</span></ChatEntityLink>;
        })}
        {message.result.links.map((item, i) => <ChatEntityLink key={i} href={getChatEntityHref(snapshot, item.entityId, item.entityType)} title={item.reason} arrow className="mt-2 text-xs font-semibold text-accent">{item.entityName}</ChatEntityLink>)}
        {message.result.caveats.length > 0 && <details className="meta-chat-limitations"><summary>Data limitations ({message.result.caveats.length})</summary><ul>{message.result.caveats.map((text, i) => <li key={i}>{text}</li>)}</ul></details>}
      </>}</article>)}

      {chat.error && <div role="alert" className="rounded-xl bg-status-red/10 p-3 text-xs text-status-red"><p>{chat.error}</p><button type="button" disabled={chat.isSending} className="mt-2 underline" onClick={() => { const last = [...chat.messages].reverse().find(item => item.role === 'user'); if (last) { setQuestion(last.content); input.current?.focus(); } }}>Edit last question</button></div>}
    </div>
    {chat.dataState.status === 'loading' && <div className="meta-chat-loading"><ChatThinking message="Preparing your ad data…" /></div>}
    {chat.isSending && <div className="meta-chat-loading"><ChatThinking /></div>}
    </div>
    <ConfirmDialog open={clearOpen} title="Clear conversation?" description="This removes the conversation saved on this device for the selected account and period." confirmLabel="Clear conversation" destructive loading={chat.isSending} onCancel={() => setClearOpen(false)} onConfirm={() => { chat.clear(); setClearOpen(false); }} />
    {scroll.hasNew && <button type="button" className="ai-chat-new" onClick={scroll.scrollToLatest}>Latest messages ↓</button>}
    <ChatComposer inputRef={input} value={question} onChange={setQuestion} ready={ready} sending={chat.isSending} onSubmit={() => { scroll.scrollToLatest(); void chat.send(question); setQuestion(''); }} />
  </>;
}

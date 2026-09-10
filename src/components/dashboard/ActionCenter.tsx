'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { downloadCsv } from '@/lib/report-export';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountDetail } from '@/hooks/useAccountDetail';
import { ACTIONS_EVENT, markActionGroups, readAccountActions, type ActionGroup, type ActionSource } from '@/lib/action-center';

const LABELS: Record<ActionSource, string> = { analysis: 'Analysis', budget: 'Budget', alerts: 'Alerts', plan: 'Plan', chat: 'AI Chat', learning: 'Evaluation' };
export function ActionCenter({ accountId, compact = false }: { accountId: string; compact?: boolean }) {
  const { state: auth } = useAuth();
  const { state: account } = useAccountDetail(accountId, auth.token);
  const accountLink = (href: string) => {
    const local = href.startsWith(`/accounts/${accountId}/`) && !href.includes('\\') ? href : `/accounts/${accountId}`;
    if (account.status !== 'success') return local;
    const [path, query] = local.split('?');
    const params = new URLSearchParams(query);
    params.set('currency', account.data.currency); params.set('accountName', account.data.name);
    return path + '?' + params.toString();
  };
  const [items, setItems] = useState<ActionGroup[]>([]);
  const [filter, setFilter] = useState('pending');
  const [error, setError] = useState('');
  useEffect(() => {
    const update = () => setItems(readAccountActions(accountId));
    update(); const timer = window.setInterval(update, 60000);
    [ACTIONS_EVENT, 'ai-learning-updated', 'storage'].forEach(event => window.addEventListener(event, update));
    return () => { clearInterval(timer); [ACTIONS_EVENT, 'ai-learning-updated', 'storage'].forEach(event => window.removeEventListener(event, update)); };
  }, [accountId]);
  const pending = items.filter(item => item.review === 'pending');
  const due = pending.filter(item => !item.dueAt || Date.parse(item.dueAt) <= Date.now());
  const visible = (compact ? due : items.filter(item => filter === 'all' ? true : filter === 'conflict' ? item.conflict : item.review === filter)).slice(0, compact ? 3 : 200);
  function mark(item: ActionGroup, value: ActionGroup['review']) {
    try { markActionGroups(accountId, [item.id], value); setError(''); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save.'); }
  }
  return <section className="ai-surface p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-accent">AI ACTION CENTER</p><h2 className="mt-2 text-xl font-bold text-text-primary">{compact ? 'Your priorities today' : 'Action Center'}</h2><p className="mt-2 text-xs leading-5 text-text-muted">Latest saved results from each source in this browser. This is not background monitoring and does not automatically change ads.</p></div>{compact && <Link href={`/accounts/${accountId}/actions`} className="text-xs font-bold text-accent">View all →</Link>}</div>
    <div className="my-4 grid grid-cols-3 gap-3">{[[due.length, 'Review today'], [pending.filter(item => item.conflict).length, 'Need comparison'], [pending.filter(item => item.source === 'learning').length, 'Evaluations due']].map(([value,label]) => <div key={label} className="rounded-xl bg-accent/5 p-3"><p className="text-2xl font-bold text-text-primary">{value}</p><p className="mt-1 text-[10px] text-text-muted">{label}</p></div>)}</div>
    {!compact && <div className="mb-4 flex flex-wrap gap-2"><button onClick={() => downloadCsv('action-center.csv', [['Entity','Action','Priority','Review status','Conflict','Saved at','Evidence'], ...items.map(item => [item.entityName,item.title,item.priority,item.review,item.conflict ? 'Yes' : 'No',item.updatedAt,item.evidence.join('; ')])])} className="rounded-xl border border-border px-3 py-2 text-xs text-text-secondary">Export CSV</button>{[['pending','Pending'],['conflict','Conflicts'],['reviewed','Reviewed'],['dismissed','Dismiss'],['all','All']].map(([value,label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-xl border px-3 py-2 text-xs ${filter === value ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-secondary'}`}>{label}</button>)}</div>}
    {error && <p role="alert" className="mb-3 text-sm text-status-red">{error}</p>}
    <div className="space-y-3">{visible.map(item => <article key={item.id} className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap gap-2"><span className="text-[10px] font-bold text-accent">{Array.from(new Set(item.members.map(member => LABELS[member.source]))).join(' · ')}</span><span className="text-[10px] text-text-muted">{item.priority === 'high' ? 'High priority' : item.priority === 'medium' ? 'Medium priority' : 'Informational'}</span></div>
      <h3 className="mt-2 text-sm font-bold text-text-primary">{item.title}</h3><p className="mt-1 text-xs text-text-secondary">{item.entityName}</p>
      {item.conflict && <p className="mt-2 rounded-lg bg-status-yellow/10 p-2 text-xs text-status-yellow">Another proposal recommends a different direction or budget for this entity. Compare the evidence before applying a change.</p>}
      <p className="mt-2 text-[10px] text-text-muted">Saved: {new Date(item.updatedAt).toLocaleString('en-US')}{item.dueAt ? ` · Due: ${new Date(item.dueAt).toLocaleDateString('en-US')}` : ''}</p>
      {Date.now() - Date.parse(item.updatedAt) > 86400000 && <p className="mt-1 text-[10px] text-status-yellow">Source data is over 24 hours old. Run a new analysis before making changes.</p>}
      <details className="mt-3 text-xs text-text-secondary"><summary className="cursor-pointer font-semibold">Evidence and sources ({item.members.length})</summary>{item.members.map((member,i) => <div key={i} className="mt-2 border-l-2 border-accent/20 pl-3"><p className="font-bold">{LABELS[member.source]}</p>{member.evidence.map((text,j) => <p key={j} className="mt-1 leading-5">{text}</p>)}</div>)}</details>
      <div className="mt-4 flex flex-wrap gap-2"><Link href={accountLink(item.href)} className="rounded-lg bg-accent/10 px-3 py-2 text-xs font-bold text-accent">Review in source tool →</Link>{item.review === 'pending' ? <><button onClick={() => mark(item,'reviewed')} className="rounded-lg border border-border px-3 py-2 text-xs text-text-secondary">Reviewed</button><button onClick={() => mark(item,'dismissed')} className="px-3 py-2 text-xs text-text-muted">Dismiss</button></> : <button onClick={() => mark(item,'pending')} className="px-3 py-2 text-xs text-accent">Return to pending</button>}</div>
    </article>)}</div>
    {!visible.length && <div className="rounded-2xl border border-dashed border-border p-6 text-sm leading-6 text-text-secondary">No actions in this view. Run an analysis, generate a plan, or ask AI to collect recommendations.<div className="mt-3 flex flex-wrap gap-4"><Link className="font-semibold text-accent" href={accountLink(`/accounts/${accountId}/optimize`)}>Analyze with AI →</Link><Link className="font-semibold text-accent" href={accountLink(`/accounts/${accountId}/optimization-plan`)}>Create a plan →</Link></div></div>}
  </section>;
}

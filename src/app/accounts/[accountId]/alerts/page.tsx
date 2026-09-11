'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useAlertCenter } from '@/hooks/useAlertCenter';
import { PageContainer } from '@/components/layout/PageContainer';
import { LoadingState } from '@/components/ui/LoadingState';
import { ControlHeader } from '@/components/layout/ControlHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import type { AIAlert, AlertSeverity } from '@/lib/types/alerts';

type LocalStatus = 'new' | 'acknowledged' | 'dismissed';

const SEVERITY_STYLE: Record<AlertSeverity, string> = {
  critical: 'border-status-red/35 bg-status-red/10 text-status-red',
  warning: 'border-status-yellow/35 bg-status-yellow/10 text-status-yellow',
  info: 'border-accent/35 bg-accent/10 text-accent',
};
const CHANGE_STYLE: Record<AlertSeverity, string> = { critical: 'text-status-red', warning: 'text-status-yellow', info: 'text-accent' };

function metricValue(alert: AIAlert, value: number, currency: string) {
  if (['ctr', 'spend_share', 'frequency'].includes(alert.metric)) return `${value.toFixed(2)}${alert.metric === 'frequency' ? 'x' : '%'}`;
  if (alert.metric === 'roas') return `${value.toFixed(2)}x`;
  if (['spend', 'daily_spend', 'cpa', 'cpl', 'cost_per_lpv', 'cost_per_engagement', 'cost_per_thruplay', 'cpm'].includes(alert.metric)) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

function AlertCard({ alert, currency, accountId, status, onStatus }: { alert: AIAlert; currency: string; accountId: string; status: LocalStatus; onStatus: (status: LocalStatus) => void }) {
  const href = alert.entityType === 'adset'
    ? `/accounts/${accountId}/campaigns/${alert.campaignId}/adsets/${alert.entityId}`
    : `/accounts/${accountId}/campaigns/${alert.campaignId}`;
  return (
    <article className={`rounded-2xl border p-4 ${status === 'dismissed' ? 'border-border bg-bg-secondary/25 opacity-60' : 'border-border bg-bg-card'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase ${SEVERITY_STYLE[alert.severity]}`}>{alert.severity}</span>
            <span className="text-[10px] font-bold uppercase text-text-muted">{alert.type.replaceAll('_', ' ')}</span>
            {status !== 'new' && <span className="rounded-md bg-bg-secondary px-2 py-1 text-[10px] font-bold uppercase text-text-muted">{status}</span>}
          </div>
          <h3 className="mt-2 text-base font-bold text-text-primary">{alert.title}</h3>
          <p className="mt-1 truncate text-xs font-semibold text-text-muted">{alert.entityName}</p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-black tabular-nums ${CHANGE_STYLE[alert.severity]}`}>{alert.changePercent > 0 ? '+' : ''}{alert.changePercent.toFixed(1)}%</p>
          <p className="text-[10px] font-semibold uppercase text-text-muted">Confidence {alert.confidence}%</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-bg-secondary p-2.5"><p className="text-[10px] font-bold uppercase text-text-muted">Baseline</p><p className="mt-1 font-bold tabular-nums text-text-secondary">{metricValue(alert, alert.baselineValue, currency)}</p></div>
        <div className="rounded-lg bg-bg-secondary p-2.5"><p className="text-[10px] font-bold uppercase text-text-muted">Current</p><p className="mt-1 font-black tabular-nums text-text-primary">{metricValue(alert, alert.currentValue, currency)}</p></div>
      </div>
      <p className="mt-3 text-xs font-semibold text-text-muted">{alert.comparison}</p>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{alert.explanation}</p>
      <div className="mt-3 rounded-lg border border-accent/20 bg-accent/[0.06] p-3"><p className="text-[10px] font-black uppercase text-accent">Recommended next action</p><p className="mt-1 text-sm text-text-secondary">{alert.recommendedAction}</p></div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <Link href={href} className="text-xs font-bold text-accent hover:underline">Open {alert.entityType} →</Link>
        <div className="flex gap-2">
          <button type="button" onClick={() => onStatus(status === 'acknowledged' ? 'new' : 'acknowledged')} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-text-secondary hover:bg-bg-secondary">{status === 'acknowledged' ? 'Mark new' : 'Acknowledge'}</button>
          <button type="button" onClick={() => onStatus(status === 'dismissed' ? 'new' : 'dismissed')} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-text-muted hover:bg-bg-secondary">{status === 'dismissed' ? 'Restore' : 'Dismiss'}</button>
        </div>
      </div>
    </article>
  );
}

export default function AlertCenterPage() {
  const { state: auth } = useAuth();
  const router = useRouter();
  const { accountId } = useParams<{ accountId: string }>();
  const searchParams = useSearchParams();
  const accountName = searchParams.get('accountName') ?? accountId;
  const currency = searchParams.get('currency') ?? 'USD';
  const { state, refresh } = useAlertCenter(accountId, auth.token);
  const [severity, setSeverity] = useState<'all' | AlertSeverity>('all');
  const [visibility, setVisibility] = useState<'open' | 'all'>('open');
  const [statuses, setStatuses] = useState<Record<string, LocalStatus>>({});

  useEffect(() => { if (!auth.isLoading && !auth.token) router.replace('/login'); }, [auth.isLoading, auth.token, router]);
  useEffect(() => {
    try { setStatuses(JSON.parse(localStorage.getItem(`alert-status:${accountId}`) ?? '{}')); } catch { setStatuses({}); }
  }, [accountId]);

  function setAlertStatus(id: string, status: LocalStatus) {
    setStatuses(current => {
      const next = { ...current, [id]: status };
      try { localStorage.setItem(`alert-status:${accountId}`, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  const alerts = state.status === 'success' ? state.result.alerts : [];
  const counts = { critical: alerts.filter(item => item.severity === 'critical' && statuses[item.id] !== 'dismissed').length, warning: alerts.filter(item => item.severity === 'warning' && statuses[item.id] !== 'dismissed').length, info: alerts.filter(item => item.severity === 'info' && statuses[item.id] !== 'dismissed').length };
  const filtered = useMemo(() => alerts.filter(alert => (severity === 'all' || alert.severity === severity) && (visibility === 'all' || statuses[alert.id] !== 'dismissed')), [alerts, severity, visibility, statuses]);

  if (auth.isLoading) return null;
  return (
    <PageContainer>
      <ControlHeader
        breadcrumbs={[{ label: 'Accounts', href: '/accounts' }, { label: accountName, href: `/accounts/${accountId}` }, { label: 'AI Alert Center' }]}
        eyebrow="On-demand diagnostics"
        title="AI Alert Center"
        description="Detect delivery, cost, ROAS, fatigue, tracking, and budget-allocation anomalies across your campaigns."
        badge="14-day review"
        stats={[{ label: 'critical', value: counts.critical, tone: counts.critical ? 'red' : 'neutral' }, { label: 'warning', value: counts.warning, tone: counts.warning ? 'amber' : 'neutral' }, { label: 'info', value: counts.info, tone: 'blue' }]}
      >
        <button type="button" onClick={refresh} disabled={state.status === 'loading'} className="rounded-lg bg-accent px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Refresh analysis</button>
      </ControlHeader>
      {state.status === 'idle' && <section className="ai-surface p-8"><h2 className="text-lg font-bold text-text-primary">Run an account health check</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">Analyze recent delivery, cost, tracking, and fatigue signals. This is an on-demand review, not background monitoring. A Meta Ads AI request is sent only when you start the analysis.</p><button onClick={refresh} className="ai-primary-button mt-5">Run analysis</button></section>}

      {state.status === 'loading' && <LoadingState message="Loading diagnostics…" />}
      {state.status === 'error' && <ErrorState message={state.error} onRetry={refresh} />}
      {state.status === 'success' && (
        <>
          <div className="mb-4 rounded-2xl border border-border bg-bg-card p-4"><p className="text-sm leading-relaxed text-text-secondary">{state.result.summary}</p><p className="mt-2 text-xs text-text-muted">{state.result.comparison}</p></div>
          <div className="mb-4 flex flex-wrap gap-2">
            {(['all', 'critical', 'warning', 'info'] as const).map(value => <button key={value} onClick={() => setSeverity(value)} className={`rounded-lg border px-3 py-2 text-xs font-bold capitalize ${severity === value ? 'border-accent bg-accent text-white' : 'border-border bg-bg-card text-text-secondary'}`}>{value}</button>)}
            <button onClick={() => setVisibility(value => value === 'open' ? 'all' : 'open')} className="ml-auto rounded-lg border border-border bg-bg-card px-3 py-2 text-xs font-bold text-text-secondary">{visibility === 'open' ? 'Show dismissed' : 'Hide dismissed'}</button>
          </div>
          {filtered.length ? <div className="grid gap-3 lg:grid-cols-2">{filtered.map(alert => <AlertCard key={alert.id} alert={alert} currency={currency} accountId={accountId} status={statuses[alert.id] ?? 'new'} onStatus={status => setAlertStatus(alert.id, status)} />)}</div> : <div className="rounded-2xl border border-status-green/30 bg-status-green/10 p-8 text-center text-status-green"><p className="font-bold">No alerts in this view</p><p className="mt-1 text-sm">No material anomalies matched the selected filters.</p></div>}
        </>
      )}
    </PageContainer>
  );
}

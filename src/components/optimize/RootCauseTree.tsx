'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { RootCauseAnalysis, RootCauseDriver, RootCauseEntityType } from '@/lib/types/root-cause';

const SEVERITY_STYLE: Record<RootCauseAnalysis['severity'], string> = {
  critical: 'border-status-red/40 bg-status-red/10 text-status-red',
  warning: 'border-status-yellow/40 bg-status-yellow/10 text-status-yellow',
  opportunity: 'border-status-green/40 bg-status-green/10 text-status-green',
  stable: 'border-border bg-bg-secondary text-text-secondary',
};

function entityHref(type: RootCauseEntityType, id: string, accountId: string, campaignId: string) {
  if (type === 'campaign') return `/accounts/${accountId}/campaigns/${id}`;
  if (type === 'adset') return `/accounts/${accountId}/campaigns/${campaignId}/adsets/${id}`;
  return null;
}

function DriverBranch({ driver, accountId, campaignId }: { driver: RootCauseDriver; accountId: string; campaignId: string }) {
  const [open, setOpen] = useState(true);
  const href = entityHref(driver.entityType, driver.entityId, accountId, campaignId);

  return (
    <div className="relative ml-5 border-l border-accent/30 pl-5">
      <span className="absolute -left-px top-5 h-px w-5 bg-accent/30" />
      <div className="rounded-xl border border-border bg-bg-secondary/50 p-3">
        <button type="button" onClick={() => setOpen(value => !value)} className="flex w-full items-start justify-between gap-3 text-left">
          <div>
            <p className="text-sm font-bold text-text-primary">{driver.label}</p>
            <p className="mt-0.5 text-xs text-text-muted">{driver.metric}: {driver.previousValue} → {driver.currentValue}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`text-xs font-black tabular-nums ${driver.changePercent > 0 ? 'text-status-red' : driver.changePercent < 0 ? 'text-status-green' : 'text-text-muted'}`}>
              {driver.changePercent > 0 ? '+' : ''}{driver.changePercent.toFixed(1)}%
            </span>
            <span className="text-text-muted">{open ? '−' : '+'}</span>
          </div>
        </button>

        {open && (
          <div className="mt-3 space-y-3 border-t border-border/60 pt-3">
            <p className="text-xs leading-relaxed text-text-secondary">{driver.evidence}</p>
            <div className="rounded-lg bg-bg-card/70 p-2.5">
              <p className="text-[10px] font-bold uppercase text-accent">Next check</p>
              <p className="mt-1 text-xs text-text-secondary">{driver.nextCheck}</p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-text-muted">Confidence {driver.confidence}%</span>
              {href && <Link href={href} className="text-xs font-bold text-accent hover:underline">Open {driver.entityType} →</Link>}
            </div>

            {driver.causes.map(cause => {
              const causeHref = entityHref(cause.entityType, cause.entityId, accountId, campaignId);
              return (
                <div key={cause.id} className="relative ml-4 border-l border-border pl-4">
                  <span className="absolute -left-px top-3 h-px w-4 bg-border" />
                  <p className="text-xs font-bold text-text-primary">{cause.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">{cause.evidence}</p>
                  <p className="mt-1 text-xs text-text-secondary"><span className="font-semibold">Verify:</span> {cause.nextCheck}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] text-text-muted">Confidence {cause.confidence}%</span>
                    {causeHref && <Link href={causeHref} className="text-[11px] font-bold text-accent hover:underline">Open →</Link>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function RootCauseTree({ analysis, accountId, campaignId }: { analysis: RootCauseAnalysis; accountId: string; campaignId: string }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-accent/30 bg-accent/[0.06] p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase text-accent">{analysis.comparisonLabel}</p>
            <h4 className="mt-1 text-base font-bold text-text-primary">{analysis.headline}</h4>
          </div>
          <span className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase ${SEVERITY_STYLE[analysis.severity]}`}>
            {analysis.severity}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
          <div>
            <p className="text-[10px] font-semibold uppercase text-text-muted">{analysis.primaryMetric.label}</p>
            <p className="text-xl font-black tabular-nums text-text-primary">{analysis.primaryMetric.previousValue} → {analysis.primaryMetric.currentValue}</p>
          </div>
          <p className={`text-sm font-black ${analysis.severity === 'critical' ? 'text-status-red' : analysis.severity === 'warning' ? 'text-status-yellow' : 'text-status-green'}`}>
            {analysis.primaryMetric.changePercent > 0 ? '+' : ''}{analysis.primaryMetric.changePercent.toFixed(1)}%
          </p>
          <p className="ml-auto text-xs font-bold text-text-secondary">Confidence {analysis.confidence}%</p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">{analysis.summary}</p>
      </div>

      <div className="space-y-3">
        {analysis.drivers.map(driver => <DriverBranch key={driver.id} driver={driver} accountId={accountId} campaignId={campaignId} />)}
      </div>
    </div>
  );
}

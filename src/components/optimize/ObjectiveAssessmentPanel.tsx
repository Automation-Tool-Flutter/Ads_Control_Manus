import type { ObjectiveAssessment } from '@/lib/types/optimize';

const STATUS_STYLE: Record<ObjectiveAssessment['status'], { label: string; className: string }> = {
  on_track: { label: 'On track', className: 'border-status-green/40 bg-status-green/10 text-status-green' },
  near_target: { label: 'Near target', className: 'border-status-yellow/40 bg-status-yellow/10 text-status-yellow' },
  off_track: { label: 'Off track', className: 'border-status-red/40 bg-status-red/10 text-status-red' },
  insufficient_data: { label: 'Insufficient data', className: 'border-border bg-bg-secondary text-text-muted' },
};

export function ObjectiveAssessmentPanel({ assessments }: { assessments?: ObjectiveAssessment[] }) {
  if (!assessments?.length) return null;

  return (
    <section className="space-y-2">
      <div>
        <p className="text-[10px] font-black uppercase text-accent">Objective-aware analysis</p>
        <h3 className="text-base font-bold text-text-primary">Primary campaign KPIs</h3>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {assessments.map(item => {
          const status = STATUS_STYLE[item.status];
          return (
            <article key={item.campaignId} className="rounded-xl border border-border bg-bg-secondary/45 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-text-primary">{item.campaignName}</p>
                  <p className="text-[10px] font-semibold uppercase text-text-muted">{item.objectiveFamily}</p>
                </div>
                <span className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold ${status.className}`}>
                  {status.label}
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-text-muted">{item.primaryKpi}</p>
                  <p className="text-xl font-black tabular-nums text-text-primary">{item.primaryValue}</p>
                </div>
                <p className="text-xs font-bold text-text-secondary">Confidence {item.confidence}%</p>
              </div>
              {item.secondaryKpis.length > 0 && (
                <p className="mt-2 text-xs text-text-secondary">{item.secondaryKpis.join(' · ')}</p>
              )}
              <p className="mt-2 text-xs leading-relaxed text-text-muted">Target: {item.target}</p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">{item.rationale}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

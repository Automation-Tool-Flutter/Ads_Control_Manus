'use client';

import { Modal } from '@/components/ui/Modal';
import type { Recommendation } from '@/lib/types/optimize';
import { formatCurrency } from '@/lib/utils';

interface Props {
  recommendation: Recommendation | null;
  currency: string;
  applying: boolean;
  onApply: () => void;
  onIgnore?: () => void;
  onClose: () => void;
}

function actionLabel(type: string) {
  if (type === 'pause_campaign') return 'Pause campaign';
  if (type === 'activate_campaign') return 'Activate campaign';
  if (type === 'update_campaign_budget') return 'Update daily budget';
  return 'Review recommendation';
}

export function CampaignActionPreview({ recommendation, currency, applying, onApply, onIgnore, onClose }: Props) {
  const action = recommendation?.action;
  if (!recommendation || !action || !action.canApply || action.type === 'none') return null;

  const isBudget = action.type === 'update_campaign_budget';

  return (
    <Modal open label="AI action preview" onClose={onClose} busy={applying}>
      <div className="relative w-full rounded-t-2xl border border-border bg-bg-card p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-accent">AI action preview</p>
            <h2 className="mt-1 text-lg font-bold text-text-primary">{actionLabel(action.type)}</h2>
          </div>
          <span className="rounded-md border border-accent/20 bg-accent/10 px-2 py-1 text-xs font-bold text-accent">
            {Math.round(action.confidence)}% confidence
          </span>
        </div>

        <div className="mt-4 space-y-3 rounded-xl border border-border bg-bg-secondary/55 p-4">
          <div>
            <p className="text-[10px] font-bold uppercase text-text-muted">Campaign</p>
            <p className="mt-1 font-semibold text-text-primary">{action.entityName}</p>
            <code className="text-xs text-text-muted">{action.entityId}</code>
          </div>

          {isBudget && (
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-border pt-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-text-muted">Current</p>
                <p className="mt-1 font-bold text-text-secondary">
                  {formatCurrency(action.currentDailyBudget, currency)}
                </p>
              </div>
              <span className="text-accent">→</span>
              <div>
                <p className="text-[10px] font-bold uppercase text-text-muted">Proposed</p>
                <p className="mt-1 font-bold text-accent">
                  {formatCurrency(action.proposedDailyBudget, currency)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <p className="leading-relaxed text-text-secondary">{action.reason}</p>
          <p className="rounded-lg border border-status-green/20 bg-status-green/5 px-3 py-2 text-status-green">
            Expected: {action.expectedImpact}
          </p>
          <p className="text-xs text-text-muted">Risk level: {action.risk}</p>
        </div>

        <div className="modal-actions mt-5 flex gap-2 sm:justify-end">
          {onIgnore && (
            <button
              onClick={onIgnore}
              disabled={applying}
              className="flex-1 rounded-lg border border-status-red/25 px-4 py-2.5 text-sm font-semibold text-status-red disabled:opacity-50 sm:flex-none"
            >
              Dismiss
            </button>
          )}
          <button
            onClick={onClose}
            disabled={applying}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text-secondary disabled:opacity-50 sm:flex-none"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            disabled={applying}
            className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 sm:flex-none"
          >
            {applying ? 'Applying…' : 'Apply change'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

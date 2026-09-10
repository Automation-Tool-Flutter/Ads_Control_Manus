"use client";

import { useState } from 'react';
import type { Recommendation } from '@/lib/types/optimize';
import { PriorityBadge } from './PriorityBadge';

interface Props {
  recommendation: Recommendation;
  onPreviewAction?: (recommendation: Recommendation) => void;
}

export function RecommendationCard({ recommendation, onPreviewAction }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const { title, description, priority, metric } = recommendation;
  const executable = Boolean(
    recommendation.action?.canApply &&
    recommendation.action.type !== 'none' &&
    onPreviewAction,
  );

  if (dismissed) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-bg-secondary/40 px-3 py-2 text-xs text-text-muted">
        <span>Recommendation dismissed</span>
        <button onClick={() => setDismissed(false)} className="font-bold text-accent">Undo</button>
      </div>
    );
  }

  return (
    <div
      className="meta-item"
    >
      <div className="meta-item-header meta-recommendation-header flex items-start justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-accent/10 text-[10px] font-black text-accent">
            GPT
          </span>
          <p className="min-w-0 flex-1 text-sm font-bold leading-snug text-text-primary">{title}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {metric && (
            <span className="rounded-md border border-accent/20 bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
              {metric}
            </span>
          )}
          <PriorityBadge priority={priority} />
        </div>
      </div>
      <p className="px-4 py-3 text-sm leading-relaxed text-text-secondary">{description}</p>
      {(executable || onPreviewAction) && (
        <div className="meta-card-actions flex items-center justify-end gap-2">
          <button
            onClick={() => setDismissed(true)}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-text-muted hover:bg-bg-secondary hover:text-text-primary"
          >
            Dismiss
          </button>
          {executable && (
            <button
              onClick={() => onPreviewAction?.(recommendation)}
              className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white hover:bg-accent/90"
            >
              Review action
            </button>
          )}
        </div>
      )}
    </div>
  );
}

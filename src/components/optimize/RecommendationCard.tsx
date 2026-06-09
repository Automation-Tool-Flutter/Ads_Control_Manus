import type { Recommendation, Priority } from '@/lib/types/optimize';
import { PriorityBadge } from './PriorityBadge';

const borderColors: Record<Priority, string> = {
  high: 'border-l-status-red',
  medium: 'border-l-status-yellow',
  low: 'border-l-text-muted',
};

interface Props {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: Props) {
  const { title, description, priority, metric } = recommendation;

  return (
    <div
      className={`meta-item border-l-4 ${borderColors[priority]}`}
    >
      <div className="meta-item-header flex items-start justify-between gap-3 px-4 py-3">
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
    </div>
  );
}

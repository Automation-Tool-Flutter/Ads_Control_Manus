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
      className={`bg-bg-card border border-border border-l-4 ${borderColors[priority]} rounded-xl p-4`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="font-semibold text-text-primary text-sm leading-snug flex-1 min-w-0">{title}</p>
        <div className="flex items-center gap-2 flex-shrink-0">
          {metric && (
            <span className="bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full text-xs font-medium">
              {metric}
            </span>
          )}
          <PriorityBadge priority={priority} />
        </div>
      </div>
      <p className="text-text-secondary text-sm leading-relaxed">{description}</p>
    </div>
  );
}

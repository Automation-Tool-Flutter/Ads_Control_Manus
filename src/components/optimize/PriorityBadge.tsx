import type { Priority } from '@/lib/types/optimize';

const colorClasses: Record<Priority, string> = {
  high: 'bg-status-red/15 text-status-red border-status-red/30',
  medium: 'bg-status-yellow/15 text-status-yellow border-status-yellow/30',
  low: 'bg-text-muted/15 text-text-muted border-text-muted/30',
};

const labels: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

interface Props {
  priority: Priority;
}

export function PriorityBadge({ priority }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${colorClasses[priority]}`}
    >
      {labels[priority]}
    </span>
  );
}

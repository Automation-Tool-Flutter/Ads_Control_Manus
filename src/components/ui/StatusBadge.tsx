import type { StatusInfo } from '@/lib/utils';

const colorClasses: Record<StatusInfo['color'], string> = {
  green: 'bg-status-green/15 text-status-green border-status-green/30',
  red: 'bg-status-red/15 text-status-red border-status-red/30',
  yellow: 'bg-status-yellow/15 text-status-yellow border-status-yellow/30',
  gray: 'bg-text-muted/15 text-text-muted border-text-muted/30',
};

const dotColors: Record<StatusInfo['color'], string> = {
  green: 'bg-status-green',
  red: 'bg-status-red',
  yellow: 'bg-status-yellow',
  gray: 'bg-text-muted',
};

interface Props {
  label: string;
  color: StatusInfo['color'];
}

export function StatusBadge({ label, color }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${colorClasses[color]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[color]}`} />
      {label}
    </span>
  );
}

export function StatusDot({ color }: { color: StatusInfo['color'] }) {
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColors[color]}`} />;
}

interface Props {
  label: string;
  value: string;
  subLabel?: string;
}

export function MetricCard({ label, value, subLabel }: Props) {
  return (
    <div className="soft-card rounded-2xl p-4">
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-bold text-text-primary tabular-nums">{value}</p>
      {subLabel && <p className="text-xs text-text-muted mt-1">{subLabel}</p>}
    </div>
  );
}

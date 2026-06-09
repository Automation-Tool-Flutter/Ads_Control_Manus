interface Props {
  score: number;
  summary: string;
}

function getScoreStyle(score: number): { ring: string; text: string; label: string } {
  if (score >= 70) {
    return {
      ring: 'border-status-green',
      text: 'text-status-green',
      label: 'Excellent',
    };
  }
  if (score >= 40) {
    return {
      ring: 'border-status-yellow',
      text: 'text-status-yellow',
      label: 'Needs Improvement',
    };
  }
  return {
    ring: 'border-status-red',
    text: 'text-status-red',
    label: 'Critical',
  };
}

export function ScoreCard({ score, summary }: Props) {
  const { ring, text, label } = getScoreStyle(score);

  return (
    <div className="meta-item">
      <div className="meta-item-header flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase text-accent">GPT decision layer</p>
          <h2 className="mt-0.5 text-base font-bold text-text-primary">Overall Score</h2>
        </div>
        <span className={`rounded-md border px-2.5 py-1 text-xs font-black ${ring} ${text}`}>
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        {/* Score ring */}
        <div
          className={`flex h-24 w-24 flex-shrink-0 flex-col items-center justify-center rounded-lg border-4 ${ring} bg-bg-secondary/60`}
        >
          <span className={`text-2xl font-bold tabular-nums leading-none ${text}`}>{score}</span>
          <span className="mt-0.5 text-xs text-text-muted">/100</span>
        </div>

        {/* Summary */}
        <div className="flex-1 min-w-0">
          <p className={`mb-1 text-sm font-semibold ${text}`}>Recommended readout</p>
          <p className="text-sm leading-relaxed text-text-secondary">{summary}</p>
        </div>
      </div>
    </div>
  );
}

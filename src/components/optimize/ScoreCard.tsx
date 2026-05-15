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
    <div className="bg-bg-card border border-border rounded-2xl p-5">
      <h2 className="text-base font-semibold text-text-primary mb-4">Overall Score</h2>
      <div className="flex items-center gap-5">
        {/* Score ring */}
        <div
          className={`flex-shrink-0 w-20 h-20 rounded-full border-4 ${ring} flex flex-col items-center justify-center`}
        >
          <span className={`text-2xl font-bold tabular-nums leading-none ${text}`}>{score}</span>
          <span className="text-text-muted text-xs mt-0.5">/100</span>
        </div>

        {/* Summary */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold mb-1 ${text}`}>{label}</p>
          <p className="text-text-secondary text-sm leading-relaxed">{summary}</p>
        </div>
      </div>
    </div>
  );
}

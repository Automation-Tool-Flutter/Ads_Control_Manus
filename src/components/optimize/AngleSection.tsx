import type { AngleResult } from "@/lib/types/optimize";
import { RecommendationCard } from "./RecommendationCard";

interface Props {
  angle: AngleResult;
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 70
      ? "text-status-green"
      : score >= 40
        ? "text-status-yellow"
        : "text-status-red";
  return (
    <span className={`text-2xl font-bold tabular-nums ${color}`}>{score}</span>
  );
}

export function AngleSection({ angle }: Props) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary/45 px-3 py-2.5">
        <div>
          <h3 className="text-base font-bold text-text-primary">
            {angle.name}
          </h3>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <ScoreRing score={angle.score} />
          <span className="text-text-muted text-sm">/100</span>
        </div>
      </div>

      {/* Strengths */}
      {angle.strengths.length > 0 && (
        <div className="rounded-lg border border-status-green/20 bg-status-green/5 p-3">
          <p className="mb-2 text-xs font-bold uppercase text-status-green">
            Strengths
          </p>
          <ul className="space-y-1.5">
            {angle.strengths.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-text-secondary"
              >
                <span className="mt-0.5 flex-shrink-0 text-[10px] font-black text-status-green">
                  OK
                </span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Issues */}
      {angle.issues.length > 0 && (
        <div className="rounded-lg border border-status-yellow/25 bg-status-yellow/5 p-3">
          <p className="mb-2 text-xs font-bold uppercase text-status-yellow">
            Areas for improvement
          </p>
          <ul className="space-y-1.5">
            {angle.issues.map((issue, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-text-secondary"
              >
                <span className="mt-0.5 flex-shrink-0 font-black text-status-yellow">
                  !
                </span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {angle.recommendations.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-text-muted">
            Recommended
          </p>
          <div className="space-y-3">
            {angle.recommendations.map((rec, i) => (
              <RecommendationCard key={i} recommendation={rec} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

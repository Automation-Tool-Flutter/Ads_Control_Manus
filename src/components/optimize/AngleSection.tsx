import type { AngleResult, Recommendation } from '@/lib/types/optimize';
import { RecommendationCard } from './RecommendationCard';
import { AdsIcon } from '@/components/layout/AdsIcon';

interface Props { angle: AngleResult; onPreviewAction?: (recommendation: Recommendation) => void; }

export function AngleSection({ angle, onPreviewAction }: Props) {
  return <div className="ai-angle-section">
    <div className="ai-angle-heading"><h3>{angle.name}</h3><span className="ai-angle-score">{Number.isFinite(angle.score) ? Math.max(0, Math.min(100, Math.round(angle.score))) : '—'}<small>/100</small></span></div>
    {angle.issues.length > 0 && <section className="ai-findings" data-kind="issues"><h4><span className="ai-finding-icon"><AdsIcon name="alert" /></span>Needs attention<span className="ai-finding-count">{angle.issues.length}</span></h4><ul>{angle.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul></section>}
    {angle.recommendations.length > 0 && <section className="ai-recommendations"><h4>Recommended next steps<span className="ai-finding-count">{angle.recommendations.length}</span></h4><div>{angle.recommendations.map((rec, i) => <RecommendationCard key={i} recommendation={rec} onPreviewAction={onPreviewAction} />)}</div></section>}
    {angle.strengths.length > 0 && <details className="ai-findings ai-strengths"><summary><span className="ai-finding-icon"><AdsIcon name="check" /></span>What’s working<span className="ai-finding-count">{angle.strengths.length}</span><AdsIcon name="chevron-down" /></summary><ul>{angle.strengths.map((strength, i) => <li key={i}>{strength}</li>)}</ul></details>}
    {!angle.issues.length && !angle.strengths.length && !angle.recommendations.length && <p className="ai-result-score-note">No findings returned for this section.</p>}
  </div>;
}

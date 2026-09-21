import { BrandLogo } from '@/components/ui/BrandLogo';

interface Props { score: number; summary: string; }

export function ScoreCard({ score, summary }: Props) {
  const valid = Number.isFinite(score);
  const value = valid ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  const tone = !valid ? 'neutral' : value >= 70 ? 'positive' : value >= 40 ? 'warning' : 'critical';
  const label = !valid ? 'Not available' : value >= 70 ? 'Strong performance' : value >= 40 ? 'Room to improve' : 'Needs review';
  return <section className="ai-result-summary" data-tone={tone} aria-label="AI analysis summary">
    <div className="ai-result-brand"><BrandLogo size={28} decorative /><span>MetaAI analysis</span><span className="ai-result-status">{label}</span></div>
    <div className="ai-result-score-row">
      <div className="ai-result-gauge" role="img" aria-label={valid ? `AI score: ${value} out of 100` : 'Score unavailable'}>
        <svg viewBox="0 0 100 100" aria-hidden="true"><circle className="ai-result-track" cx="50" cy="50" r="43" /><circle className="ai-result-progress" cx="50" cy="50" r="43" pathLength="100" strokeDasharray={`${value} 100`} /></svg>
        <div><strong>{valid ? value : '—'}</strong><span>/ 100</span></div>
      </div>
      <div><p className="ai-result-eyebrow">Performance assessment</p><h2>Performance at a glance</h2><p className="ai-result-score-note">AI estimate based on available data</p></div>
    </div>
    <div className="ai-result-readout"><h3>Key takeaway</h3><p>{summary}</p></div>
    <details className="ai-result-context"><summary>How to read this score</summary><p>This is an AI assessment, not a verified performance rating. Missing insights can limit the assessment. Review the findings and source data before changing ads.</p></details>
  </section>;
}

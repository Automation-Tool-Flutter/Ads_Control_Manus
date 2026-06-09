'use client';

import type { PageInsightMetric, DatePreset, DateRange } from '@/lib/types';
import { ScoreCard } from '@/components/optimize/ScoreCard';
import { AngleTabs } from '@/components/optimize/AngleTabs';
import type { InsightAnalysisState } from '@/hooks/usePageInsightAnalysis';

interface Props {
  metrics: PageInsightMetric[];
  filter: DatePreset | DateRange;
  state: InsightAnalysisState;
  onAnalyze: () => void;
  onReset: () => void;
}

export function InsightAICard({ metrics: _metrics, filter: _filter, state, onAnalyze, onReset }: Props) {
  const { step, analysis, error } = state;

  // ── Idle: trigger card ──
  if (step === 'idle') {
    return (
      <div className="meta-item mb-4">
        <div className="meta-item-header px-5 py-4">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-accent">GPT insight layer</p>
          <h2 className="mt-1 text-base font-semibold text-text-primary">AI Analysis</h2>
          <p className="text-text-secondary text-sm mt-2">
            Get AI-powered insights on your page performance — growth trends, engagement strengths, and content recommendations.
          </p>
        </div>
        <div className="p-5">
        <button
          onClick={onAnalyze}
          className="w-full bg-text-primary hover:bg-slate-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          Analyze with GPT
        </button>
        </div>
      </div>
    );
  }

  // ── Analyzing: spinner ──
  if (step === 'analyzing') {
    return (
      <div className="meta-item p-5 mb-4">
        <h2 className="text-base font-semibold text-text-primary mb-4">GPT Analysis</h2>
        <div className="flex items-center gap-3 text-text-secondary text-sm">
          <svg className="w-5 h-5 animate-spin text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Analyzing page performance...
        </div>
      </div>
    );
  }

  // ── Error ──
  if (step === 'error') {
    return (
      <div className="meta-item p-5 mb-4">
        <h2 className="text-base font-semibold text-text-primary mb-2">GPT Analysis</h2>
        <p className="text-status-red text-sm mb-4">{error}</p>
        <button
          onClick={onAnalyze}
          className="w-full bg-text-primary hover:bg-slate-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  // ── Done: full analysis ──
  if (!analysis) return null;

  return (
    <div className="mb-4 space-y-4">
      {/* Score + summary — reuse ScoreCard */}
      <div className="relative">
        <ScoreCard score={analysis.overallScore} summary={analysis.summary} />
        <button
          onClick={onReset}
          className="absolute top-5 right-5 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Angles — reuse AngleTabs */}
      {analysis.angles && analysis.angles.length > 0 && (
        <AngleTabs angles={analysis.angles} />
      )}
    </div>
  );
}

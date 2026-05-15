'use client';

import { useState } from 'react';
import type { DatePreset, DateRange } from '@/lib/types';
import type { OptimizeStep } from '@/lib/types/optimize';
import { DateFilter } from '@/components/ui/DateFilter';

interface Props {
  step: OptimizeStep;
  onAnalyze: (datePreset: DatePreset) => void;
}

export function AnalyzeButton({ step, onAnalyze }: Props) {
  const [dateFilter, setDateFilter] = useState<DatePreset | DateRange>('last_30d');

  const isAnalyzing = step === 'collecting' || step === 'building' || step === 'analyzing';

  function handleAnalyze() {
    // Only presets supported for optimize (AI needs consistent data window)
    const preset = typeof dateFilter === 'string' ? dateFilter : 'last_30d';
    onAnalyze(preset);
  }

  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5">
      <h2 className="text-base font-semibold text-text-primary mb-1">AI Analysis & Optimization</h2>
      <p className="text-text-secondary text-sm mb-3">
        Select a date range and click Analyze to get AI-powered optimization recommendations.
      </p>

      <div className="mb-3">
        <DateFilter value={dateFilter} onChange={setDateFilter} disabled={isAnalyzing} />
      </div>

      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing}
        className="w-full bg-accent hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {isAnalyzing ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analyzing...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
            Analyze with AI
          </>
        )}
      </button>
    </div>
  );
}

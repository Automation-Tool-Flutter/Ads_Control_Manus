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
    <div className="meta-item">
      <div className="meta-item-header px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase text-accent">GPT optimization layer</p>
            <h2 className="mt-1 text-base font-semibold text-text-primary">AI Analysis & Optimization</h2>
          </div>
          <span className="rounded-md border border-accent/20 bg-accent/10 px-2.5 py-1 text-xs font-black text-accent">
            GPT
          </span>
        </div>
        <p className="mt-2 text-sm text-text-secondary">
          Select a date range and click Analyze to get AI-powered optimization recommendations.
        </p>
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
        <DateFilter value={dateFilter} onChange={setDateFilter} disabled={isAnalyzing} />

        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="meta-action meta-action-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
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
              Analyze with GPT
            </>
          )}
        </button>
      </div>
    </div>
  );
}

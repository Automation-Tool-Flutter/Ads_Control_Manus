'use client';

import { useEffect, useState } from 'react';
import type { PagePost } from '@/lib/types';
import type { GeminiAnalysis } from '@/lib/types/optimize';
import { ScoreCard } from '@/components/optimize/ScoreCard';
import { AngleSection } from '@/components/optimize/AngleSection';

interface Props {
  post: PagePost | null;
  onClose: () => void;
}

type Step = 'analyzing' | 'done' | 'error';

export function PostAIModal({ post, onClose }: Props) {
  const [step, setStep] = useState<Step>('analyzing');
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!post) return;
    setStep('analyzing');
    setAnalysis(null);
    setError(null);

    const payload = {
      message: post.message,
      story: post.story,
      created_time: post.created_time,
      likes: post.likes?.summary.total_count ?? 0,
      comments: post.comments?.summary.total_count ?? 0,
      shares: post.shares?.count ?? 0,
      reactions: post.reactions?.summary.total_count ?? post.likes?.summary.total_count ?? 0,
    };

    const controller = new AbortController();

    fetch('/api/post-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Analysis failed.');
        setAnalysis(data as GeminiAnalysis);
        setStep('done');
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Analysis failed.');
        setStep('error');
      });

    return () => controller.abort();
  }, [post]);

  if (!post) return null;

  const text = post.message || post.story || '';

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative w-full sm:max-w-lg bg-bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '85dvh', marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-text-primary">AI Post Analysis</h2>
            {text && (
              <p className="text-xs text-text-muted mt-0.5 truncate max-w-xs">{text}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-secondary rounded-lg hover:bg-white/5 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <svg className="w-8 h-8 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-text-secondary text-sm">Analyzing post...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <p className="text-status-red text-sm">{error}</p>
              <button
                onClick={() => {
                  // re-trigger by closing and reopening — or inline retry
                  setStep('analyzing');
                  setError(null);
                  const payload = {
                    message: post.message,
                    story: post.story,
                    created_time: post.created_time,
                    likes: post.likes?.summary.total_count ?? 0,
                    comments: post.comments?.summary.total_count ?? 0,
                    shares: post.shares?.count ?? 0,
                    reactions: post.reactions?.summary.total_count ?? post.likes?.summary.total_count ?? 0,
                  };
                  fetch('/api/post-analysis', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  })
                    .then(async res => {
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error ?? 'Analysis failed.');
                      setAnalysis(data as GeminiAnalysis);
                      setStep('done');
                    })
                    .catch(err => {
                      setError(err instanceof Error ? err.message : 'Analysis failed.');
                      setStep('error');
                    });
                }}
                className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent/90 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {step === 'done' && analysis && (
            <>
              <ScoreCard score={analysis.overallScore} summary={analysis.summary} />
              {analysis.angles?.map(angle => (
                <div key={angle.level} className="bg-bg-secondary border border-border rounded-2xl p-4">
                  <AngleSection angle={angle} />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

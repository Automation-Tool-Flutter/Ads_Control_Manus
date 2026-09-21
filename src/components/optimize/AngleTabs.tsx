'use client';
import { useId, useState } from 'react';
import type { AngleResult, Recommendation } from '@/lib/types/optimize';
import { AngleSection } from './AngleSection';

interface Props { angles: AngleResult[]; onPreviewAction?: (recommendation: Recommendation) => void; }
export function AngleTabs({ angles, onPreviewAction }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const id = useId();
  const selected = Math.min(activeIndex, Math.max(0, angles.length - 1));
  if (!angles.length) return null;
  return <section className="ai-analysis-details" aria-label="Analysis breakdown">
    <div className="ai-analysis-heading"><h2>Detailed insights</h2><span>{angles.length} areas reviewed</span></div>
    <div className="ai-analysis-tabs" role="tablist" aria-label="Analysis areas">
      {angles.map((angle, i) => <button key={angle.level} type="button" id={`${id}-tab-${i}`} role="tab" aria-selected={selected === i} aria-controls={`${id}-panel`} tabIndex={selected === i ? 0 : -1} onClick={() => setActiveIndex(i)} onKeyDown={event => {
        const next = event.key === 'ArrowRight' ? (i + 1) % angles.length : event.key === 'ArrowLeft' ? (i - 1 + angles.length) % angles.length : event.key === 'Home' ? 0 : event.key === 'End' ? angles.length - 1 : null;
        if (next === null) return;
        event.preventDefault(); setActiveIndex(next);
        const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]');
        buttons?.[next]?.focus();
      }}>{angle.name}</button>)}
    </div>
    <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${selected}`} tabIndex={0} className="ai-analysis-panel">
      <AngleSection angle={angles[selected]} onPreviewAction={onPreviewAction} />
    </div>
  </section>;
}

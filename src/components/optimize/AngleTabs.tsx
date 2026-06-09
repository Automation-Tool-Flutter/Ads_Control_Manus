'use client';

import { useState } from 'react';
import type { AngleResult } from '@/lib/types/optimize';
import { AngleSection } from './AngleSection';

interface Props {
  angles: AngleResult[];
}

export function AngleTabs({ angles }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="rounded-lg border border-border bg-bg-card shadow-sm">
      {/* Tab bar — horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto border-b border-border bg-bg-secondary/55 px-3 py-3 lg:hidden">
        {angles.map((angle, i) => (
          <button
            key={angle.level}
            onClick={() => setActiveIndex(i)}
            className={`flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeIndex === i
                ? 'bg-text-primary text-white shadow-lg shadow-slate-900/15'
                : 'border border-border bg-bg-card text-text-secondary hover:border-border/80 hover:text-text-primary'
            }`}
          >
            {angle.name}
          </button>
        ))}
      </div>

      {/* Mobile: show active tab content */}
      <div className="p-4 lg:hidden">
        {angles[activeIndex] && (
          <div>
            <AngleSection angle={angles[activeIndex]} />
          </div>
        )}
      </div>

      {/* Desktop: all sections stacked */}
      <div className="hidden divide-y divide-border lg:block">
        {angles.map((angle) => (
          <div key={angle.level} className="p-4">
            <AngleSection angle={angle} />
          </div>
        ))}
      </div>
    </div>
  );
}

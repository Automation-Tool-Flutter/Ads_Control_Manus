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
    <div>
      {/* Tab bar — horizontal scroll on mobile */}
      <div className="flex overflow-x-auto gap-2 pb-1 -mx-4 px-4 mb-6 lg:hidden">
        {angles.map((angle, i) => (
          <button
            key={angle.level}
            onClick={() => setActiveIndex(i)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeIndex === i
                ? 'bg-accent text-white'
                : 'bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-border/80'
            }`}
          >
            {angle.name}
          </button>
        ))}
      </div>

      {/* Mobile: show active tab content */}
      <div className="lg:hidden">
        {angles[activeIndex] && (
          <div className="bg-bg-card border border-border rounded-2xl p-5">
            <AngleSection angle={angles[activeIndex]} />
          </div>
        )}
      </div>

      {/* Desktop: all sections stacked */}
      <div className="hidden lg:space-y-6 lg:block">
        {angles.map((angle) => (
          <div key={angle.level} className="bg-bg-card border border-border rounded-2xl p-5">
            <AngleSection angle={angle} />
          </div>
        ))}
      </div>
    </div>
  );
}

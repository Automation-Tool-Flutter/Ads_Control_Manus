'use client';

import { AdsIcon } from '@/components/layout/AdsIcon';
import { BrandLogo } from '@/components/ui/BrandLogo';

const STARTERS = [
  { label: 'Improve performance', prompt: 'Which campaigns should I prioritize for optimization?', icon: 'chart' },
  { label: 'Review my budget', prompt: 'Which campaigns are wasting the most budget?', icon: 'budget' },
  { label: 'Plan my next move', prompt: 'Build a seven-day optimization plan.', icon: 'plan' },
];

/** Suggestions fill the composer so a tap never spends an AI request by accident. */
export function ChatWelcome({ onSelect, disabled = false }: {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}) {
  return <div className="meta-ai-welcome">
    <div className="meta-ai-welcome-mark"><BrandLogo size={56} decorative /></div>
    <h2>What can I help you with?</h2>
    <p>Let’s find your next opportunity in ads.</p>
    <div className="meta-ai-starters">
      {STARTERS.map(item => <button key={item.label} type="button" disabled={disabled} onClick={() => onSelect(item.prompt)}>
        <span className="meta-ai-starter-icon" aria-hidden="true"><AdsIcon name={item.icon} /></span>
        <span>{item.label}</span>
        <span className="meta-ai-starter-arrow" aria-hidden="true"><AdsIcon name="chevron-right" /></span>
      </button>)}
    </div>
    <small>Insights from your selected ad account. Changes stay in your control.</small>
  </div>;
}

'use client';

import { useEffect, useState } from 'react';

interface ConsentDialogProps {
  open: boolean;
  onClose: () => void;
}

const REQUIRED_TYPES = [
  {
    id: 'transactions',
    label: 'Transaction notifications',
    freq: 'instant',
    description: 'Budget spend alerts, successful or failed payments, and changes related to your ad account.',
  },
  {
    id: 'performance',
    label: 'Performance reports',
    freq: 'weekly',
    description: 'Campaign results summary, CPM, CTR, ROAS metrics and AI-powered optimization suggestions.',
  },
  {
    id: 'alerts',
    label: 'Account alerts',
    freq: 'instant',
    description: 'Notifications when ads are rejected, budget is running low, or your account needs attention.',
  },
];

function CheckboxReadonly() {
  return (
    <span className="flex items-center justify-center w-5 h-5 rounded border-2 bg-accent/40 border-accent/40 flex-shrink-0 mt-0.5">
      <svg className="w-3 h-3 text-white/70" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
        <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function ConsentDialog({ open, onClose }: ConsentDialogProps) {
  const [features, setFeatures] = useState(true);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full sm:w-auto sm:min-w-[480px] sm:max-w-lg bg-bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85dvh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <h3 className="text-base font-semibold text-text-primary">
            Choose the emails you'd like to receive from Ads Manager
          </h3>
          <p className="text-xs text-text-muted mt-1">
            You can change these preferences at any time in Settings.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          {/* Required items — disabled */}
          {REQUIRED_TYPES.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <CheckboxReadonly />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-text-primary leading-snug">
                  {item.label}{' '}
                  <span className="font-normal text-text-muted">({item.freq})</span>
                </span>
                <span className="block text-xs text-text-secondary mt-0.5 leading-relaxed">
                  {item.description}
                </span>
              </span>
            </div>
          ))}

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Optional — features */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <span className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={features}
                onChange={() => setFeatures((v) => !v)}
                className="sr-only"
              />
              <span className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-colors ${
                features
                  ? 'bg-accent border-accent'
                  : 'bg-transparent border-border group-hover:border-accent/60'
              }`}>
                {features && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-text-primary leading-snug">
                New features & tips{' '}
                <span className="font-normal text-text-muted">(monthly)</span>
              </span>
              <span className="block text-xs text-text-secondary mt-0.5 leading-relaxed">
                Updates on new app features, ad strategy guides, and the latest news from Meta Ads.
              </span>
            </span>
          </label>
        </div>

        {/* Footer — single button */}
        <div className="px-6 py-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 sm:py-2 text-sm font-semibold bg-accent text-white hover:bg-accent/90 rounded-xl transition-colors min-h-[44px] sm:min-h-0"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

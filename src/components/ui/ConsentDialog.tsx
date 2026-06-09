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
    <span className="mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded border-2 border-accent/40 bg-accent/40 sm:h-5 sm:w-5">
      <svg className="h-3 w-3 text-white/70" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
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
    <div className="fixed inset-0 z-[80] flex items-end justify-center overflow-x-hidden px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative flex max-h-[min(78dvh,620px)] w-full max-w-[calc(100vw-1rem)] min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-bg-card shadow-2xl sm:w-auto sm:min-w-[480px] sm:max-w-lg">
        {/* Header */}
        <div className="min-w-0 border-b border-border px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-6">
          <h3 className="max-w-full break-words text-[15px] font-semibold leading-snug text-text-primary sm:text-base">
            Choose the emails you'd like to receive from Ads Manager
          </h3>
          <p className="mt-1 max-w-full break-words text-xs leading-relaxed text-text-muted">
            You can change these preferences at any time in Settings.
          </p>
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-4 py-3 sm:space-y-4 sm:px-6 sm:py-4">
          {/* Required items — disabled */}
          {REQUIRED_TYPES.map((item) => (
            <div key={item.id} className="flex min-w-0 items-start gap-3">
              <CheckboxReadonly />
              <span className="flex-1 min-w-0">
                <span className="block max-w-full break-words text-[13px] font-semibold leading-snug text-text-primary sm:text-sm">
                  {item.label}{' '}
                  <span className="font-normal text-text-muted">({item.freq})</span>
                </span>
                <span className="mt-0.5 block max-w-full break-words text-xs leading-relaxed text-text-secondary">
                  {item.description}
                </span>
              </span>
            </div>
          ))}

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Optional — features */}
          <label className="group flex min-w-0 cursor-pointer items-start gap-3">
            <span className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={features}
                onChange={() => setFeatures((v) => !v)}
                className="sr-only"
              />
              <span className={`flex h-[18px] w-[18px] items-center justify-center rounded border-2 transition-colors sm:h-5 sm:w-5 ${
                features
                  ? 'bg-accent border-accent'
                  : 'bg-transparent border-border group-hover:border-accent/60'
              }`}>
                {features && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </span>
            <span className="flex-1 min-w-0">
              <span className="block max-w-full break-words text-[13px] font-semibold leading-snug text-text-primary sm:text-sm">
                New features & tips{' '}
                <span className="font-normal text-text-muted">(monthly)</span>
              </span>
              <span className="mt-0.5 block max-w-full break-words text-xs leading-relaxed text-text-secondary">
                Updates on new app features, ad strategy guides, and the latest news from Meta Ads.
              </span>
            </span>
          </label>
        </div>

        {/* Footer — single button */}
        <div className="flex justify-end border-t border-border px-4 py-3 sm:px-6 sm:py-4">
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

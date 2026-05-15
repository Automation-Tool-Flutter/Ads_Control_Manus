'use client';

import { useState } from 'react';
import type { DatePreset, DateRange } from '@/lib/types';

const DEFAULT_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'last_7d',  label: 'Last 7 days' },
  { value: 'last_14d', label: 'Last 14 days' },
  { value: 'last_30d', label: 'Last 30 days' },
  { value: 'maximum',  label: 'Live' },
];

type SelectValue = DatePreset | 'custom';

interface Props {
  value: DatePreset | DateRange;
  onChange: (value: DatePreset | DateRange) => void;
  disabled?: boolean;
  presets?: { value: DatePreset; label: string }[];
}

function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}

export function DateFilter({ value, onChange, disabled, presets = DEFAULT_PRESETS }: Props) {
  const isCustom = typeof value !== 'string';
  const today = toISODate(new Date());
  const minDate = toISODate(new Date(Date.now() - 93 * 24 * 60 * 60 * 1000));
  const weekAgo = toISODate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  const [selectValue, setSelectValue] = useState<SelectValue>(isCustom ? 'custom' : (value as DatePreset));
  const [since, setSince] = useState(isCustom ? (value as DateRange).since : weekAgo);
  const [until, setUntil] = useState(isCustom ? (value as DateRange).until : today);

  function handleSelectChange(newVal: SelectValue) {
    setSelectValue(newVal);
    if (newVal !== 'custom') {
      onChange(newVal);
    }
  }

  function handleApply() {
    if (since && until && since <= until && since >= minDate && until <= today) {
      onChange({ since, until });
    }
  }

  return (
    <div className="space-y-2">
      {/* Select dropdown */}
      <div className="relative">
        <select
          value={selectValue}
          onChange={(e) => handleSelectChange(e.target.value as SelectValue)}
          disabled={disabled}
          className="w-full appearance-none bg-bg-secondary border border-border rounded-lg px-3 py-2 pr-8 text-text-primary text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {presets.map((p) => (
            <option key={p.value} value={p.value} className="bg-bg-secondary">
              {p.label}
            </option>
          ))}
          <option value="custom" className="bg-bg-secondary">Custom</option>
        </select>
        <svg
          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>

      {/* Custom date range */}
      {selectValue === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={since}
            min={minDate}
            max={until || today}
            onChange={(e) => setSince(e.target.value)}
            disabled={disabled}
            className="flex-1 min-w-0 bg-bg-secondary border border-border rounded-lg px-2 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/50 disabled:opacity-50 transition-colors"
          />
          <span className="text-text-muted text-xs flex-shrink-0">–</span>
          <input
            type="date"
            value={until}
            min={since || minDate}
            max={today}
            onChange={(e) => setUntil(e.target.value)}
            disabled={disabled}
            className="flex-1 min-w-0 bg-bg-secondary border border-border rounded-lg px-2 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/50 disabled:opacity-50 transition-colors"
          />
          <button
            onClick={handleApply}
            disabled={disabled || !since || !until || since > until || since < minDate || until > today}
            className="flex-shrink-0 px-3 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}

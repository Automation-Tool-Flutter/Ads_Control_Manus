'use client';

import { useEffect, useId, useState } from 'react';
import type { DatePreset, DateRange } from '@/lib/types';
import { Modal } from './Modal';

const DEFAULT_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'last_7d', label: 'Last 7 days' },
  { value: 'last_14d', label: 'Last 14 days' },
  { value: 'last_30d', label: 'Last 30 days' },
  { value: 'maximum', label: 'Live' },
];
type SelectValue = DatePreset | 'custom';
interface Props {
  value: DatePreset | DateRange;
  onChange: (value: DatePreset | DateRange) => void;
  disabled?: boolean;
  allowCustom?: boolean;
  presets?: { value: DatePreset; label: string }[];
}

function localDate(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function DateFilter({ value, onChange, disabled, allowCustom = true, presets = DEFAULT_PRESETS }: Props) {
  const id = useId();
  const today = localDate(new Date());
  const minDate = localDate(new Date(Date.now() - 93 * 86400000));
  const weekAgo = localDate(new Date(Date.now() - 7 * 86400000));
  const preset = typeof value === 'string' ? value : 'custom';
  const activeSince = typeof value === 'string' ? '' : value.since;
  const activeUntil = typeof value === 'string' ? '' : value.until;
  const [selection, setSelection] = useState<SelectValue>(preset);
  const [since, setSince] = useState(activeSince || weekAgo);
  const [until, setUntil] = useState(activeUntil || today);
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => {
    setSelection(preset);
    if (activeSince) setSince(activeSince);
    if (activeUntil) setUntil(activeUntil);
  }, [preset, activeSince, activeUntil]);
  const error = !since || !until ? 'Choose both dates.' : since > until ? 'End date must be on or after start date.' : since < minDate ? 'Choose a start date within the last 93 days.' : until > today ? 'End date cannot be in the future.' : '';
  const inputClass = 'w-full min-w-0 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary disabled:opacity-50';
  const resetDraft = () => { setSelection(preset); setSince(activeSince || weekAgo); setUntil(activeUntil || today); };
  const closeSheet = () => { setSheetOpen(false); resetDraft(); };
  const periodLabel = typeof value === 'string' ? presets.find(item => item.value === value)?.label ?? value : `${value.since} – ${value.until}`;

  return (
    <div className="date-filter space-y-3">
      <button type="button" className="mobile-date-trigger" disabled={disabled} aria-haspopup="dialog" aria-expanded={sheetOpen} onClick={() => { resetDraft(); setSheetOpen(true); }}><span>Period · {periodLabel}</span><span aria-hidden="true">⌄</span></button>
      <div className="date-filter-desktop space-y-3">
      <select aria-label="Reporting period" value={selection} disabled={disabled} className={inputClass}
        onChange={event => {
          const next = event.target.value as SelectValue;
          setSelection(next);
          if (next !== 'custom') onChange(next);
        }}>
        {presets.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        {allowCustom && <option value="custom">Custom date range</option>}
      </select>
      {selection === 'custom' && (
        <div className="date-filter-range">
          <label htmlFor={id + '-since'}>Start date
            <input id={id + '-since'} type="date" value={since} min={minDate} max={until || today}
              onChange={event => setSince(event.target.value)} disabled={disabled} className={inputClass}
              aria-describedby={error ? id + '-error' : undefined} />
          </label>
          <label htmlFor={id + '-until'}>End date
            <input id={id + '-until'} type="date" value={until} min={since || minDate} max={today}
              onChange={event => setUntil(event.target.value)} disabled={disabled} className={inputClass}
              aria-describedby={error ? id + '-error' : undefined} />
          </label>
          {error && <p id={id + '-error'} role="alert" className="text-xs text-status-red">{error}</p>}
          <button type="button" onClick={() => { if (!error && !disabled) onChange({ since, until }); }}
            disabled={disabled || Boolean(error)} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            Apply dates
          </button>
        </div>
      )}
      </div>
      <Modal open={sheetOpen} label="Reporting period" onClose={closeSheet}>
        <div className="collection-filter-sheet">
          <div className="collection-sheet-heading"><h2>Reporting period</h2><button type="button" aria-label="Close reporting period" onClick={closeSheet}>✕</button></div>
          <p className="collection-filter-note">Choose the dates to use for your report.</p>
          <div className="date-preset-options" role="group" aria-label="Date presets">
            {[...presets, ...(allowCustom ? [{ value: 'custom' as const, label: 'Custom date range' }] : [])].map(item => <button type="button" key={item.value} disabled={disabled} aria-pressed={selection === item.value} onClick={() => setSelection(item.value)}><span>{item.label}</span>{selection === item.value && <span aria-hidden="true">✓</span>}</button>)}
          </div>
          {selection === 'custom' && <div className="date-filter-range">
            <label htmlFor={id + '-mobile-since'}>Start date<input id={id + '-mobile-since'} type="date" className={inputClass} value={since} min={minDate} max={until || today} disabled={disabled} onChange={event => setSince(event.target.value)} aria-describedby={error ? id + '-mobile-error' : undefined} /></label>
            <label htmlFor={id + '-mobile-until'}>End date<input id={id + '-mobile-until'} type="date" className={inputClass} value={until} min={since || minDate} max={today} disabled={disabled} onChange={event => setUntil(event.target.value)} aria-describedby={error ? id + '-mobile-error' : undefined} /></label>
            {error && <p role="alert" id={id + '-mobile-error'}>{error}</p>}
          </div>}
          <div className="modal-actions collection-sheet-actions"><button type="button" className="meta-action meta-action-secondary" onClick={closeSheet}>Cancel</button><button type="button" className="meta-action meta-action-primary" disabled={disabled || (selection === 'custom' && Boolean(error))} onClick={() => {
            if (disabled || (selection === 'custom' && error)) return;
            onChange(selection === 'custom' ? { since, until } : selection); setSheetOpen(false);
          }}>Apply period</button></div>
        </div>
      </Modal>
    </div>
  );
}

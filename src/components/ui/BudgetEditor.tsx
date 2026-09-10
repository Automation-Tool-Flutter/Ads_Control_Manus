'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { amountToRawBudget, rawBudgetToAmount } from '@/lib/utils';

interface BudgetEditorProps {
  value: string | undefined; // raw value in smallest currency unit (cents/đồng)
  currency?: string;
  onSave: (newValue: string) => Promise<void>;
  disabled?: boolean;
}

function formatForDisplay(raw: string | undefined, currency: string): string {
  if (!raw) return '—';
  const num = parseInt(raw, 10);
  if (isNaN(num)) return '—';
  return rawBudgetToAmount(num, currency).toLocaleString();
}

export function BudgetEditor({ value, currency = 'VND', onSave, disabled }: BudgetEditorProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const errorId = useId();
  const [error, setError] = useState('');
  const saving = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      const num = value ? rawBudgetToAmount(value, currency) : 0;
      setInputVal(isNaN(num) ? '' : String(num));
      setError('');
      const frame = requestAnimationFrame(() => inputRef.current?.select());
      return () => cancelAnimationFrame(frame);
    }
  }, [editing, value, currency]);

  async function handleSave() {
    if (saving.current || disabled) return;
    const num = Number(inputVal.replace(/,/g, ''));
    if (!inputVal.trim() || !Number.isFinite(num) || num < 0) { setError('Enter a valid amount of zero or more.'); return; }
    saving.current = true;
    setError('');
    setLoading(true);
    try {
      await onSave(amountToRawBudget(num, currency));
      setEditing(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save the budget. Try again.');
    } finally {
      saving.current = false;
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); void handleSave(); }
    if (e.key === 'Escape' && !loading) { e.stopPropagation(); setEditing(false); }
  }

  if (editing) {
    return (
      <div className="budget-editor flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          enterKeyHint="done"
          aria-label={`Budget amount in ${currency}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          min="0"
          step="any"
          value={inputVal}
          onChange={e => { setInputVal(e.target.value); setError(''); }}
          onKeyDown={handleKeyDown}
          disabled={loading || disabled}
          className="w-28 px-2 py-1 text-sm font-medium bg-bg-secondary border border-accent rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button type="button"
          onClick={handleSave}
          disabled={loading || disabled}
          className="text-xs font-semibold text-accent hover:text-accent/80 px-2 py-1 bg-accent/10 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? '...' : 'Save'}
        </button>
        <button type="button"
          disabled={loading}
          onClick={() => setEditing(false)}
          className="text-xs text-text-muted hover:text-text-secondary px-2 py-1 transition-colors"
        >
          Cancel
        </button>
        {error && <p id={errorId} role="alert" className="w-full text-xs leading-5 text-status-red">{error}</p>}
      </div>
    );
  }

  return (
    <button type="button"
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      aria-label={`Edit budget, currently ${formatForDisplay(value, currency)} ${currency}`}
      className="budget-edit-trigger group flex items-center gap-1.5 text-sm font-medium text-text-primary hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span>{formatForDisplay(value, currency)} {value ? currency : ''}</span>
      {!disabled && (
        <svg className="w-3.5 h-3.5 text-text-muted group-hover:text-accent opacity-0 group-hover:opacity-100 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
        </svg>
      )}
    </button>
  );
}

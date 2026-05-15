'use client';

import { useState, useRef, useEffect } from 'react';

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
  // Meta returns budget in cents for USD, in VND directly
  const divisor = currency === 'VND' ? 1 : 100;
  return (num / divisor).toLocaleString();
}

export function BudgetEditor({ value, currency = 'VND', onSave, disabled }: BudgetEditorProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      const divisor = currency === 'VND' ? 1 : 100;
      const num = value ? parseInt(value, 10) / divisor : 0;
      setInputVal(isNaN(num) ? '' : String(num));
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, value, currency]);

  async function handleSave() {
    const num = parseFloat(inputVal.replace(/,/g, ''));
    if (isNaN(num) || num < 0) return;
    setLoading(true);
    try {
      const divisor = currency === 'VND' ? 1 : 100;
      await onSave(String(Math.round(num * divisor)));
      setEditing(false);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="w-28 px-2 py-1 text-sm font-medium bg-bg-secondary border border-accent rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          onClick={handleSave}
          disabled={loading}
          className="text-xs font-semibold text-accent hover:text-accent/80 px-2 py-1 bg-accent/10 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? '...' : 'Save'}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-text-muted hover:text-text-secondary px-2 py-1 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => !disabled && setEditing(true)}
      disabled={disabled}
      className="group flex items-center gap-1.5 text-sm font-medium text-text-primary hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

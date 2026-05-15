'use client';

import { useState } from 'react';

interface StatusToggleProps {
  status: 'ACTIVE' | 'PAUSED' | string;
  onToggle: (newStatus: 'ACTIVE' | 'PAUSED') => Promise<void>;
  disabled?: boolean;
}

export function StatusToggle({ status, onToggle, disabled }: StatusToggleProps) {
  const [loading, setLoading] = useState(false);
  const isActive = status === 'ACTIVE';

  async function handleToggle() {
    if (loading || disabled) return;
    setLoading(true);
    try {
      await onToggle(isActive ? 'PAUSED' : 'ACTIVE');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading || disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-secondary ${
        isActive ? 'bg-status-green' : 'bg-gray-500/60'
      } ${loading || disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={isActive ? 'Click to pause' : 'Click to activate'}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          isActive ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <svg className="w-3 h-3 animate-spin text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </span>
      )}
    </button>
  );
}

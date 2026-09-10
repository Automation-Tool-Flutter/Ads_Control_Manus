'use client';

import { useRef, useState } from 'react';
import { useToast } from './Toaster';

interface StatusToggleProps {
  status: 'ACTIVE' | 'PAUSED' | string;
  onToggle: (newStatus: 'ACTIVE' | 'PAUSED') => Promise<void>;
  disabled?: boolean;
}

export function StatusToggle({ status, onToggle, disabled }: StatusToggleProps) {
  const { toast } = useToast();
  const pending = useRef(false);
  const [loading, setLoading] = useState(false);
  const isActive = status === 'ACTIVE';

  async function handleToggle() {
    if (pending.current || disabled) return;
    pending.current = true;
    setLoading(true);
    try {
      await onToggle(isActive ? 'PAUSED' : 'ACTIVE');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update status. Try again.', 'error');
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading || disabled}
      type="button"
      role="switch"
      aria-checked={isActive}
      aria-busy={loading}
      aria-label={isActive ? 'Pause delivery' : 'Activate delivery'}
      className={`status-toggle focus-visible:ring-2 focus-visible:ring-accent ${loading || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isActive ? 'Pause delivery' : 'Activate delivery'}
    >
      <span className={`status-toggle-track ${isActive ? 'bg-status-green' : 'bg-gray-500/60'}`} aria-hidden="true">
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
      </span>
    </button>
  );
}

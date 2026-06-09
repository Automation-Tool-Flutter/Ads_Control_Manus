'use client';

import { useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog — bottom sheet on mobile, centered on desktop */}
      <div className="relative w-full sm:w-auto sm:min-w-[360px] sm:max-w-md bg-bg-card border border-border rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-text-primary mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-text-secondary mb-5">{description}</p>
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-medium text-text-secondary bg-bg-secondary hover:bg-white/[0.06] border border-border rounded-xl transition-colors disabled:opacity-50 min-h-[44px] sm:min-h-0"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 min-h-[44px] sm:min-h-0 ${
              destructive
                ? 'bg-status-red text-white hover:bg-status-red/90'
                : 'bg-accent text-white hover:bg-accent/90'
            }`}
          >
            {loading ? 'Loading...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

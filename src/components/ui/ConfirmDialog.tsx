'use client';

import { useId } from 'react';
import { Modal } from './Modal';

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
  open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  destructive = false, loading = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const descriptionId = useId();
  return (
    <Modal open={open} label={title} onClose={onCancel} busy={loading}>
      <div className="w-full sm:max-w-md rounded-2xl border border-border bg-bg-card p-5 shadow-xl">
        <h3 className="mb-2 text-lg font-semibold text-text-primary">{title}</h3>
        {description && <p id={descriptionId} className="mb-5 text-sm leading-6 text-text-secondary">{description}</p>}
        <div className="modal-actions mt-4 flex flex-wrap gap-2 sm:justify-end">
          <button type="button" onClick={onCancel} disabled={loading}
            className="min-h-[44px] rounded-xl border border-border bg-bg-secondary px-4 py-2.5 text-sm font-medium text-text-secondary disabled:opacity-50">
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} disabled={loading}
            aria-describedby={description ? descriptionId : undefined}
            className={`min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${destructive ? 'bg-status-red' : 'bg-accent'}`}>
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

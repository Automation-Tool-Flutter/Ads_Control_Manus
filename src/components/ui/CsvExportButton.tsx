'use client';

import { useRef, useState } from 'react';
import { downloadCsv } from '@/lib/report-export';
import { useToast } from './Toaster';

export function CsvExportButton({ filename, rows, disabled, className }: {
  filename: string;
  rows: Array<Array<string | number | null | undefined>>;
  disabled?: boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const { toast } = useToast();
  const exportFile = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true);
    try { await downloadCsv(filename, rows); }
    catch (error) { toast(error instanceof Error ? error.message : 'Could not export CSV. Please try again.', 'error'); }
    finally { pending.current = false; setBusy(false); }
  };
  return <button type="button" disabled={disabled || busy} aria-busy={busy} aria-label="Export CSV"
    className={className} onClick={exportFile}>
    {busy ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : 'Export CSV'}
  </button>;
}

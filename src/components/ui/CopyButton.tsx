'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from './Toaster';

interface Props {
  value: string;
  className?: string;
}

export function CopyButton({ value, className = '' }: Props) {
  const { toast } = useToast();
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
      toast('Copied to clipboard.', 'success');
    } catch {
      toast('Copy failed. Touch and hold the text to copy it manually.', 'error');
    }
  }

  return (
    <button type="button"
      aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
      onClick={handleCopy}
      className={`copy-button text-text-muted hover:text-text-secondary transition-colors p-1 rounded hover:bg-white/5 ${className}`}
      title="Copy"
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-status-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

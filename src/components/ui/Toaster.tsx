'use client';

import { createContext, useContext, useCallback, useState, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ─── Single toast item ────────────────────────────────────────────────────────

const ICONS: Record<ToastType, React.ReactNode> = {
  success: (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  ),
};

const STYLES: Record<ToastType, string> = {
  success: 'bg-status-green/15 border-status-green/30 text-status-green',
  error:   'bg-status-red/15 border-status-red/30 text-status-red',
  info:    'bg-accent/15 border-accent/30 text-accent',
};

function ToastEl({ item, onRemove }: { item: ToastItem; onRemove: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onRemove(item.id), item.type === 'error' ? 9000 : 5000);
    return () => clearTimeout(timer);
  }, [item.id, item.type, onRemove, paused]);
  return (
    <div className={`toast-item flex items-center gap-2 rounded-xl border bg-bg-card px-3 py-2 text-sm shadow-lg ${STYLES[item.type]}`}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
      {ICONS[item.type]}
      <span role={item.type === 'error' ? 'alert' : 'status'} className="min-w-0 flex-1 break-words text-text-primary">{item.message}</span>
      <button type="button" onClick={() => onRemove(item.id)} aria-label="Dismiss notification" className="rounded-lg text-lg text-text-secondary">×</button>
    </div>
  );
}

// ─── Provider + Toaster UI ────────────────────────────────────────────────────

let _nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++_nextId;
    setToasts(prev => [...prev.slice(-2), { id, type, message }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Safe-area-aware notifications with explicit dismissal. */}
      <div className="toast-stack">
        {toasts.map(item => (
          <ToastEl key={item.id} item={item} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

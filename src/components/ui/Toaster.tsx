'use client';

import { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';

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

const DURATION = 3500;

function ToastEl({ item, onRemove }: { item: ToastItem; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide in
    const showTimer = setTimeout(() => setVisible(true), 10);
    // Start fade out
    const hideTimer = setTimeout(() => setVisible(false), DURATION - 400);
    // Remove from DOM
    const removeTimer = setTimeout(() => onRemove(item.id), DURATION);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
  }, [item.id, onRemove]);

  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg backdrop-blur-sm transition-all duration-300 ${STYLES[item.type]} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      {ICONS[item.type]}
      <span className="text-text-primary">{item.message}</span>
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
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast stack — bottom-center on mobile, bottom-right on desktop */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center w-[calc(100vw-2rem)] sm:w-auto max-w-sm pointer-events-none">
        {toasts.map(item => (
          <ToastEl key={item.id} item={item} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

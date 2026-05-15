'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toaster';

interface Props {
  className?: string;
}

export function FacebookLoginButton({ className = '' }: Props) {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    setIsLoading(true);
    try {
      const user = await login();
      toast(`Welcome, ${user.name}!`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        onClick={handleLogin}
        disabled={isLoading}
        className="w-full mobile-action flex items-center justify-center gap-3 px-5 bg-accent hover:bg-accent/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-full transition-all shadow-xl shadow-accent/25 active:scale-[0.98]"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        )}
        {isLoading ? 'Signing in...' : 'Continue with Facebook'}
      </button>

      {error && (
        <p className="text-status-red text-sm text-center px-2">{error}</p>
      )}
    </div>
  );
}

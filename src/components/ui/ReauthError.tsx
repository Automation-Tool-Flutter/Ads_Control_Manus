'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toaster';
import { ErrorState } from '@/components/ui/ErrorState';
import { FB_PERMISSION_ERROR_CODES } from '@/lib/constants';

export function isPermissionError(message: string, errorCode?: number): boolean {
  if (errorCode !== undefined && FB_PERMISSION_ERROR_CODES.includes(errorCode)) return true;
  return /permission|authorize|oauth|scope|pages_show_list|pages_read/i.test(message);
}

interface ReauthErrorProps {
  message: string;
  errorCode?: number;
  permissionHint?: string;
  onRetry?: () => void;
}

export function ReauthError({ message, errorCode, permissionHint, onRetry }: ReauthErrorProps) {
  const { logout, login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  if (!isPermissionError(message, errorCode)) {
    return <ErrorState message={message} onRetry={onRetry} />;
  }

  async function handleReauth() {
    try {
      logout();
      await login({ rerequest: true });
      router.refresh();
      onRetry?.();
    } catch {
      toast('Sign in failed', 'error');
      router.replace('/');
    }
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-status-yellow/10 flex items-center justify-center">
        <svg className="w-8 h-8 text-status-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <div>
        <p className="font-semibold text-text-primary mb-1">Additional permissions required</p>
        <p className="text-text-secondary text-sm max-w-xs">
          {permissionHint ? (
            <>This app needs the <code className="text-accent text-xs">{permissionHint}</code> permission. </>
          ) : null}
          Please sign in again to grant the required permissions.
        </p>
      </div>
      <button
        onClick={handleReauth}
        className="px-5 py-2.5 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors min-h-[44px]"
      >
        Sign in again to grant permissions
      </button>
    </div>
  );
}

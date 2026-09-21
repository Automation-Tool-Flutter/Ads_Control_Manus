'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FB_AUTH_ERROR_EVENT } from '@/lib/constants';
import { useToast } from '@/components/ui/Toaster';

/**
 * Listens for the global fb-auth-error event (dispatched by graphFetch when
 * the token is expired/invalid), shows a toast, then redirects to /login.
 * The actual state logout is handled by AuthContext.
 */
export function AuthNotifier() {
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    function handleAuthError() {
      toast('Your session has expired, please sign in again', 'error');
      router.replace('/');
    }
    window.addEventListener(FB_AUTH_ERROR_EVENT, handleAuthError);
    return () => window.removeEventListener(FB_AUTH_ERROR_EVENT, handleAuthError);
  }, [toast, router]);

  return null;
}

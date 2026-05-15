'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FB_AUTH_ERROR_EVENT } from '@/lib/constants';
import { useToast } from '@/components/ui/Toaster';
import { useAuth } from '@/contexts/AuthContext';
import { ConsentDialog } from '@/components/ui/ConsentDialog';

/**
 * Listens for the global fb-auth-error event (dispatched by graphFetch when
 * the token is expired/invalid), shows a toast, then redirects to /login.
 * The actual state logout is handled by AuthContext.
 * Also shows a consent dialog after each fresh login.
 */
export function AuthNotifier() {
  const { toast } = useToast();
  const router = useRouter();
  const { state } = useAuth();
  const [showConsent, setShowConsent] = useState(false);
  const prevUserRef = useRef(state.user);

  const CONSENT_SESSION_KEY = 'ads_consent_shown';

  useEffect(() => {
    const prevUser = prevUserRef.current;
    prevUserRef.current = state.user;

    if (prevUser === null && state.user !== null) {
      // null → user: fresh login OR F5 session restore
      // sessionStorage persists through F5 but resets on new tab/close
      const alreadyShown = sessionStorage.getItem(CONSENT_SESSION_KEY) === 'true';
      if (!alreadyShown) setShowConsent(true);
    } else if (prevUser !== null && state.user === null) {
      // user → null: logout — clear flag so next login shows dialog again
      sessionStorage.removeItem(CONSENT_SESSION_KEY);
    }
  }, [state.user]);

  const handleClose = useCallback(() => {
    sessionStorage.setItem(CONSENT_SESSION_KEY, 'true');
    setShowConsent(false);
  }, []);

  useEffect(() => {
    function handleAuthError() {
      toast('Your session has expired, please sign in again', 'error');
      router.replace('/');
    }
    window.addEventListener(FB_AUTH_ERROR_EVENT, handleAuthError);
    return () => window.removeEventListener(FB_AUTH_ERROR_EVENT, handleAuthError);
  }, [toast, router]);

  return <ConsentDialog open={showConsent} onClose={handleClose} />;
}

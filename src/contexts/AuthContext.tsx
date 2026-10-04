'use client';

import React, { createContext, useContext, useEffect, useCallback, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { AuthState, FBUser } from '@/lib/types';
import { clearViewMemory } from '@/lib/view-memory';
import { FB_AUTH_ERROR_EVENT } from '@/lib/constants';
import { clearFacebookOAuthCallbackUrl, parseFacebookOAuthCallback } from '@/lib/facebook-oauth';
import { bootstrapSession, clearLegacyLoginStorage, sessionRequest, type BrowserSession } from '@/lib/auth-client';
import { clearGraphCache } from '@/lib/api/client';
import { useToast } from '@/components/ui/Toaster';

interface AuthContextValue {
  state: AuthState;
  isRedirecting: boolean;
  login: (options?: { rerequest?: boolean }) => Promise<FBUser>;
  logout: (onLogoutRequested?: () => Promise<unknown>) => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
const loggedOut: AuthState = { token: null, user: null, isLoading: false };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ ...loggedOut, isLoading: true });
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [expiresAt, setExpiresAt] = useState(0);
  const generation = useRef(0);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => { setIsRedirecting(false); }, [pathname]);

  const publish = useCallback((session: BrowserSession | null) => {
    // Compatibility with existing hooks: token is now a public cache scope,
    // never a Facebook credential. Authentication is exclusively cookie-based.
    setState(session ? { token: session.scope, user: session.user, isLoading: false } : loggedOut);
    setExpiresAt(session?.expiresAt ?? 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let delay: ReturnType<typeof setTimeout> | undefined;
    const current = generation.current;
    clearLegacyLoginStorage();
    const callback = parseFacebookOAuthCallback(window.location);
    const request = callback ? bootstrapSession(callback) : bootstrapSession();
    if (callback) clearFacebookOAuthCallbackUrl();
    void (async () => {
      try {
        const result = await request;
        if (cancelled || current !== generation.current) return;
        if (!result.completedOAuth || !result.session) { publish(result.session); return; }
        let destination = '/accounts';
        if (result.returnTo?.startsWith('/')) {
          const target = new URL(result.returnTo, window.location.origin);
          if (target.origin === window.location.origin && !['/', '/login'].includes(target.pathname)) destination = target.pathname + target.search + target.hash;
        }
        setIsRedirecting(true);
        router.prefetch(destination);
        delay = setTimeout(() => {
          if (cancelled || current !== generation.current) return;
          publish(result.session);
          router.replace(destination);
        }, 3000);
      } catch (error) {
        if (!cancelled && current === generation.current) {
          setIsRedirecting(false); publish(null);
          toast(error instanceof Error ? error.message : 'Unable to restore your session. Please sign in again.', 'error');
        }
      }
    })();
    return () => { cancelled = true; clearTimeout(delay); };
  }, [router, publish, toast]);

  const logout = useCallback(async (onLogoutRequested?: () => Promise<unknown>) => {
    ++generation.current;
    // Send to Flutter immediately. Native logout may close the WebView without
    // resolving its Promise, so cookie cleanup must not wait for an acknowledgement.
    try { void onLogoutRequested?.().catch(() => {}); }
    catch { /* Native delivery must not prevent web session cleanup. */ }
    // Give the host 1.5 seconds to handle the event before changing the web session.
    if (onLogoutRequested) await new Promise<void>(resolve => setTimeout(resolve, 1500));
    await sessionRequest('DELETE');
    clearLegacyLoginStorage(); clearViewMemory(); clearGraphCache();
    setIsRedirecting(false); publish(null);
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('ads-session');
        try { channel.postMessage('logout'); } finally { channel.close(); }
      } catch { /* Cross-tab sync is optional in embedded WebViews. */ }
    }
  }, [publish]);

  useEffect(() => {
    const invalidate = () => {
      ++generation.current;
      clearViewMemory(); clearGraphCache(); publish(null);
      void sessionRequest('DELETE').catch(() => {});
    };
    window.addEventListener(FB_AUTH_ERROR_EVENT, invalidate);
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('ads-session') : null;
    if (channel) channel.onmessage = () => { ++generation.current; clearViewMemory(); clearGraphCache(); publish(null); };
    const checkExpiry = () => { if (expiresAt && Date.now() >= expiresAt) invalidate(); };
    const timer = setInterval(checkExpiry, 30000);
    window.addEventListener('focus', checkExpiry);
    return () => { channel?.close(); clearInterval(timer); window.removeEventListener('focus', checkExpiry); window.removeEventListener(FB_AUTH_ERROR_EVENT, invalidate); };
  }, [expiresAt, publish]);

  const login = useCallback(async (options: { rerequest?: boolean } = {}): Promise<FBUser> => {
    setState(value => ({ ...value, isLoading: true }));
    const params = new URLSearchParams({ returnTo: window.location.pathname + window.location.search });
    if (options.rerequest) params.set('rerequest', '1');
    window.location.assign('/api/auth/facebook/start?' + params);
    return new Promise<FBUser>(() => {});
  }, []);

  return <AuthContext.Provider value={{ state, isRedirecting, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}

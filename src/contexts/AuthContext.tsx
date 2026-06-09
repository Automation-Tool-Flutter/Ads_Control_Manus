'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { AuthState, FBUser } from '@/lib/types';
import {
  STORAGE_KEYS,
  FB_AUTH_ERROR_EVENT,
  FB_PERMISSIONS,
} from '@/lib/constants';
import {
  buildFacebookOAuthUrl,
  clearFacebookOAuthCallbackUrl,
  clearCookieValue,
  createFacebookOAuthState,
  fetchFacebookPermissions,
  fetchFacebookUser,
  getCookieValue,
  getFacebookOAuthRedirectUri,
  parseFacebookOAuthCallback,
  type FacebookOAuthCallback,
  type FacebookOAuthError,
} from '@/lib/facebook-oauth';

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_AUTH'; payload: { token: string; user: FBUser } }
  | { type: 'LOGOUT' };

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_AUTH':
      return { ...state, token: action.payload.token, user: action.payload.user, isLoading: false };
    case 'LOGOUT':
      return { token: null, user: null, isLoading: false };
    default:
      return state;
  }
}

const initialState: AuthState = {
  token: null,
  user: null,
  isLoading: true,
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthContextValue {
  state: AuthState;
  login: (options?: { rerequest?: boolean }) => Promise<FBUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isOAuthError(
  callback: FacebookOAuthCallback | FacebookOAuthError,
): callback is FacebookOAuthError {
  return 'error' in callback;
}

function isLocalOAuthCallback() {
  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
}

function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.GRANTED_SCOPES);
  localStorage.removeItem(STORAGE_KEYS.DENIED_SCOPES);
}

function clearOAuthRequest() {
  localStorage.removeItem(STORAGE_KEYS.OAUTH_STATE);
  localStorage.removeItem(STORAGE_KEYS.OAUTH_RETURN_TO);
  clearCookieValue(STORAGE_KEYS.OAUTH_STATE);
  clearCookieValue(STORAGE_KEYS.OAUTH_RETURN_TO);
}

function clearOAuthState() {
  localStorage.removeItem(STORAGE_KEYS.OAUTH_STATE);
  clearCookieValue(STORAGE_KEYS.OAUTH_STATE);
}

function restoreStoredSession(dispatch: React.Dispatch<Action>) {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const userStr = localStorage.getItem(STORAGE_KEYS.USER);
  const expiryStr = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);

  const isExpired = expiryStr ? Date.now() > parseInt(expiryStr, 10) : false;

  if (token && userStr && !isExpired) {
    try {
      const user = JSON.parse(userStr) as FBUser;
      dispatch({ type: 'SET_AUTH', payload: { token, user } });
    } catch {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
    return;
  }

  if (isExpired) {
    clearStoredSession();
  }
  dispatch({ type: 'SET_LOADING', payload: false });
}

async function finishOAuthLogin(callback: FacebookOAuthCallback) {
  const permissionResponse = await fetchFacebookPermissions(callback.accessToken);
  const granted = permissionResponse.granted.length > 0
    ? permissionResponse.granted
    : callback.grantedScopes;
  const denied = Array.from(new Set([
    ...permissionResponse.denied,
    ...callback.deniedScopes,
  ]));
  const missing = FB_PERMISSIONS.filter((permission) => !granted.includes(permission));

  if (missing.length > 0) {
    localStorage.setItem(STORAGE_KEYS.GRANTED_SCOPES, JSON.stringify(granted));
    localStorage.setItem(STORAGE_KEYS.DENIED_SCOPES, JSON.stringify(denied));
    throw new Error(`Facebook connected, but missing permissions: ${missing.join(', ')}`);
  }

  const user = await fetchFacebookUser(callback.accessToken);
  const expiresAt = callback.expiresIn > 0
    ? Date.now() + callback.expiresIn * 1000
    : Date.now() + 60 * 24 * 60 * 60 * 1000;

  localStorage.setItem(STORAGE_KEYS.TOKEN, callback.accessToken);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.GRANTED_SCOPES, JSON.stringify(granted));
  localStorage.setItem(STORAGE_KEYS.DENIED_SCOPES, JSON.stringify(denied));
  localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, String(expiresAt));

  return user;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Restore session or complete the OAuth redirect after Facebook returns.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const oauthCallback = parseFacebookOAuthCallback(window.location);

      if (!oauthCallback) {
        restoreStoredSession(dispatch);
        return;
      }

      try {
        const expectedState =
          localStorage.getItem(STORAGE_KEYS.OAUTH_STATE) ??
          getCookieValue(STORAGE_KEYS.OAUTH_STATE);

        if (
          !oauthCallback.state ||
          (expectedState && oauthCallback.state !== expectedState) ||
          (!expectedState && !isLocalOAuthCallback())
        ) {
          throw new Error('Invalid Facebook OAuth state. Please sign in again.');
        }

        clearFacebookOAuthCallbackUrl();

        if (isOAuthError(oauthCallback)) {
          throw new Error(oauthCallback.errorDescription ?? oauthCallback.error);
        }

        const user = await finishOAuthLogin(oauthCallback);
        clearOAuthState();

        if (!cancelled) {
          dispatch({
            type: 'SET_AUTH',
            payload: { token: oauthCallback.accessToken, user },
          });
        }
      } catch (error) {
        clearStoredSession();
        clearOAuthRequest();
        clearFacebookOAuthCallbackUrl();
        if (!cancelled) {
          dispatch({ type: 'SET_LOADING', payload: false });
          console.error(error);
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-logout when any API call detects an expired/invalid token
  useEffect(() => {
    function handleAuthError() {
      clearStoredSession();
      dispatch({ type: 'LOGOUT' });
    }
    window.addEventListener(FB_AUTH_ERROR_EVENT, handleAuthError);
    return () => window.removeEventListener(FB_AUTH_ERROR_EVENT, handleAuthError);
  }, []);

  const login = useCallback(async (options: { rerequest?: boolean } = {}): Promise<FBUser> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const state = createFacebookOAuthState();
      const redirectUri = getFacebookOAuthRedirectUri();
      const returnTo = `${window.location.pathname}${window.location.search}`;

      localStorage.setItem(STORAGE_KEYS.OAUTH_STATE, state);
      if (returnTo !== '/login') {
        localStorage.setItem(STORAGE_KEYS.OAUTH_RETURN_TO, returnTo);
      } else {
        localStorage.removeItem(STORAGE_KEYS.OAUTH_RETURN_TO);
      }

      window.location.assign(buildFacebookOAuthUrl({
        redirectUri,
        state,
        rerequest: options.rerequest,
      }));

      return await new Promise<FBUser>(() => {});
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredSession();
    clearOAuthRequest();
    dispatch({ type: 'LOGOUT' });
    if (typeof window !== 'undefined' && window.FB) {
      window.FB.logout(() => {});
    }
  }, []);

  return (
    <AuthContext.Provider value={{ state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

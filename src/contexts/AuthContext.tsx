'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { AuthState, FBUser } from '@/lib/types';
import {
  STORAGE_KEYS,
  FB_AUTH_ERROR_EVENT,
  FB_API_VERSION,
  FB_APP_ID,
  FB_LOGIN_CONFIG_ID,
  FB_PERMISSIONS,
} from '@/lib/constants';
import { loadFacebookSDK, type FB, type FBLoginResponse } from '@/lib/facebook-sdk';

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

type FBPermissionStatus = 'granted' | 'declined' | 'expired';

interface FBPermission {
  permission: string;
  status: FBPermissionStatus;
}

function fbLogin(FB: FB, request: { rerequest?: boolean } = {}): Promise<FBLoginResponse> {
  const loginOptions: {
    scope?: string;
    return_scopes: boolean;
    config_id?: string;
    auth_type?: 'rerequest';
  } = {
    return_scopes: true,
  };

  if (FB_LOGIN_CONFIG_ID) {
    loginOptions.config_id = FB_LOGIN_CONFIG_ID;
  } else {
    loginOptions.scope = FB_PERMISSIONS.join(',');
  }

  if (request.rerequest) loginOptions.auth_type = 'rerequest';

  return new Promise((resolve) => {
    FB.login(resolve, loginOptions);
  });
}

function getLoginStatus(FB: FB): Promise<FBLoginResponse> {
  return new Promise((resolve) => {
    FB.getLoginStatus(resolve);
  });
}

function getGrantedPermissions(FB: FB): Promise<{
  granted: string[];
  denied: string[];
}> {
  return new Promise((resolve) => {
    FB.api('/me/permissions', {}, (res) => {
      const data = (
        res &&
        typeof res === 'object' &&
        'data' in res &&
        Array.isArray((res as { data?: unknown }).data)
          ? (res as { data: FBPermission[] }).data
          : []
      );

      const granted = data
        .filter((item) => item.status === 'granted')
        .map((item) => item.permission);
      const denied = data
        .filter((item) => item.status !== 'granted')
        .map((item) => item.permission);

      resolve({ granted, denied });
    });
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Preload SDK on mount
  useEffect(() => {
    loadFacebookSDK(FB_APP_ID, FB_API_VERSION).catch(() => {});
  }, []);

  // Restore session on mount
  useEffect(() => {
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
    } else {
      if (isExpired) {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Auto-logout when any API call detects an expired/invalid token
  useEffect(() => {
    function handleAuthError() {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.GRANTED_SCOPES);
      localStorage.removeItem(STORAGE_KEYS.DENIED_SCOPES);
      dispatch({ type: 'LOGOUT' });
    }
    window.addEventListener(FB_AUTH_ERROR_EVENT, handleAuthError);
    return () => window.removeEventListener(FB_AUTH_ERROR_EVENT, handleAuthError);
  }, []);

  const login = useCallback(async (options: { rerequest?: boolean } = {}): Promise<FBUser> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const FB = await loadFacebookSDK(FB_APP_ID, FB_API_VERSION);
      const loginResponse = await fbLogin(FB, options);

      if (loginResponse.status !== 'connected' || !loginResponse.authResponse) {
        throw new Error('Login failed or was cancelled');
      }

      const latestStatus = await getLoginStatus(FB);
      const connectedResponse =
        latestStatus.status === 'connected' && latestStatus.authResponse
          ? latestStatus
          : loginResponse;
      const { accessToken, expiresIn, grantedScopes, deniedScopes } =
        connectedResponse.authResponse!;

      const permissionResponse = await getGrantedPermissions(FB);
      const granted = permissionResponse.granted.length > 0
        ? permissionResponse.granted
        : grantedScopes?.split(',').map((scope) => scope.trim()).filter(Boolean) ?? [];
      const denied = Array.from(new Set([
        ...permissionResponse.denied,
        ...(deniedScopes?.split(',').map((scope) => scope.trim()).filter(Boolean) ?? []),
      ]));
      const missing = FB_PERMISSIONS.filter((permission) => !granted.includes(permission));

      if (missing.length > 0) {
        localStorage.setItem(STORAGE_KEYS.GRANTED_SCOPES, JSON.stringify(granted));
        localStorage.setItem(STORAGE_KEYS.DENIED_SCOPES, JSON.stringify(denied));
        throw new Error(`Facebook connected, but missing permissions: ${missing.join(', ')}`);
      }

      const userResponse = await new Promise<FBUser>((resolve, reject) => {
        FB.api('/me', { fields: 'id,name,email,picture' }, (res) => {
          if (res && typeof res === 'object' && 'id' in res) {
            resolve(res as FBUser);
          } else {
            reject(new Error('Failed to fetch user info'));
          }
        });
      });

      localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userResponse));
      localStorage.setItem(STORAGE_KEYS.GRANTED_SCOPES, JSON.stringify(granted));
      localStorage.setItem(STORAGE_KEYS.DENIED_SCOPES, JSON.stringify(denied));
      const expiresAt = expiresIn > 0
        ? Date.now() + expiresIn * 1000
        : Date.now() + 60 * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, String(expiresAt));

      dispatch({ type: 'SET_AUTH', payload: { token: accessToken, user: userResponse } });
      return userResponse;
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.GRANTED_SCOPES);
    localStorage.removeItem(STORAGE_KEYS.DENIED_SCOPES);
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

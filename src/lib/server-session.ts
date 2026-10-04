import { NextRequest, NextResponse } from 'next/server';
import { STORAGE_KEYS } from './constants';

export const SESSION_ID_COOKIE = 'ads_session_id';
export const AUTH_COOKIE_KEYS = [STORAGE_KEYS.TOKEN, STORAGE_KEYS.TOKEN_EXPIRY, STORAGE_KEYS.USER,
  STORAGE_KEYS.GRANTED_SCOPES, STORAGE_KEYS.DENIED_SCOPES, STORAGE_KEYS.OAUTH_STATE,
  STORAGE_KEYS.OAUTH_RETURN_TO, SESSION_ID_COOKIE];

export function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store, private', Vary: 'Cookie' } });
}

export function trustedAuthRequest(request: NextRequest) {
  // Cross-origin callers cannot send this header without a CORS preflight.
  // Neither auth nor the Facebook proxy enables CORS.
  return request.headers.get('x-auth-request') === '1' &&
    !['cross-site', 'same-site'].includes(request.headers.get('sec-fetch-site') ?? '');
}

export function cookieOptions(request: NextRequest, maxAge: number) {
  return { path: '/', httpOnly: true, sameSite: 'lax' as const, maxAge,
    secure: request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https' };
}

export function clearSession(response: NextResponse, request: NextRequest) {
  for (const key of AUTH_COOKIE_KEYS) response.cookies.set(key, '', cookieOptions(request, 0));
  return response;
}

export function readSession(request: NextRequest) {
  const token = request.cookies.get(STORAGE_KEYS.TOKEN)?.value;
  const expiresAt = Number(request.cookies.get(STORAGE_KEYS.TOKEN_EXPIRY)?.value);
  const id = request.cookies.get(SESSION_ID_COOKIE)?.value;
  if (!token || !id || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  return { token, expiresAt, id };
}

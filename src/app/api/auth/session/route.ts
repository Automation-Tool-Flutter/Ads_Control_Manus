import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { FB_PERMISSIONS, STORAGE_KEYS } from '@/lib/constants';
import { fetchFacebookPermissions, fetchFacebookUser } from '@/lib/facebook-oauth';
import { privateJson, trustedAuthRequest, clearSession, readSession, cookieOptions, SESSION_ID_COOKIE } from '@/lib/server-session';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  if (!trustedAuthRequest(request)) return privateJson({ error: 'Forbidden' }, 403);
  const session = readSession(request);
  try {
    const user = JSON.parse(request.cookies.get(STORAGE_KEYS.USER)?.value ?? 'null');
    if (!session || typeof user?.id !== 'string' || typeof user?.name !== 'string') {
      return clearSession(privateJson({ session: null }), request);
    }
    // Only a public cache scope and profile leave the server, never Facebook credentials.
    return privateJson({ session: { scope: `session:${session.id}`, user, expiresAt: session.expiresAt } });
  } catch { return clearSession(privateJson({ session: null }), request); }
}

export async function POST(request: NextRequest) {
  if (!trustedAuthRequest(request)) return privateJson({ error: 'Forbidden' }, 403);
  try {
    const body = await request.json();
    const expected = request.cookies.get(STORAGE_KEYS.OAUTH_STATE)?.value;
    if (!expected || body.state !== expected) {
      return clearSession(privateJson({ error: 'Invalid Facebook OAuth state. Please sign in again.' }, 400), request);
    }
    if (typeof body.accessToken !== 'string' || !body.accessToken || body.accessToken.length > 3000) {
      return clearSession(privateJson({ error: 'Invalid login session.' }, 400), request);
    }
    const permissions = await fetchFacebookPermissions(body.accessToken);
    const missing = FB_PERMISSIONS.filter(permission => !permissions.granted.includes(permission));
    if (missing.length) return clearSession(privateJson({ error: `Missing Facebook permissions: ${missing.join(', ')}` }, 400), request);
    const profile = await fetchFacebookUser(body.accessToken);
    const user = { id: profile.id, name: profile.name, email: profile.email, picture: profile.picture };
    const seconds = Number(body.expiresIn);
    if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Invalid expiry');
    const maxAge = Math.min(Math.floor(seconds || 60 * 86400), 60 * 86400);
    if (maxAge < 1) throw new Error('Expired');
    const expiresAt = Date.now() + maxAge * 1000;
    const id = randomUUID();
    const values: Record<string, string> = {
      [STORAGE_KEYS.TOKEN]: body.accessToken, [STORAGE_KEYS.USER]: JSON.stringify(user),
      [STORAGE_KEYS.TOKEN_EXPIRY]: String(expiresAt), [SESSION_ID_COOKIE]: id,
      [STORAGE_KEYS.GRANTED_SCOPES]: JSON.stringify(permissions.granted),
      [STORAGE_KEYS.DENIED_SCOPES]: JSON.stringify(permissions.denied),
    };
    if (Object.entries(values).some(([key, value]) => key.length + encodeURIComponent(value).length > 3800)) throw new Error('Cookie too large');
    const returnTo = request.cookies.get(STORAGE_KEYS.OAUTH_RETURN_TO)?.value;
    const response = clearSession(privateJson({ session: { scope: `session:${id}`, user, expiresAt }, returnTo }), request);
    for (const [key, value] of Object.entries(values)) response.cookies.set(key, value, cookieOptions(request, maxAge));
    return response;
  } catch {
    return clearSession(privateJson({ error: 'Unable to verify Facebook login. Please sign in again.' }, 400), request);
  }
}

export function DELETE(request: NextRequest) {
  if (!trustedAuthRequest(request)) return privateJson({ error: 'Forbidden' }, 403);
  return clearSession(privateJson({ session: null }), request);
}

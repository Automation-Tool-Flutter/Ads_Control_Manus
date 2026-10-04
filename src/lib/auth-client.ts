import { STORAGE_KEYS } from './constants';
import type { FBUser } from './types';

export interface BrowserSession { scope: string; user: FBUser; expiresAt: number }

export async function sessionRequest(method = 'GET', body?: unknown): Promise<{ session: BrowserSession | null; returnTo?: string }> {
  const response = await fetch('/api/auth/session', {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: { 'X-Auth-Request': '1', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Unable to update login session.');
  return result;
}

export function clearLegacyLoginStorage() {
  try {
    for (const key of Object.values(STORAGE_KEYS)) localStorage.removeItem(key);
    // Previous Graph cache keys and Page payloads included access tokens.
    for (const key of Object.keys(localStorage)) if (key.startsWith('gfc:')) localStorage.removeItem(key);
  } catch { /* Login cookies do not depend on localStorage being available. */ }
}

let bootstrap: Promise<{ session: BrowserSession | null; returnTo?: string; completedOAuth: boolean }> | undefined;
export function bootstrapSession(body?: unknown) {
  if (!bootstrap) {
    bootstrap = sessionRequest(body ? 'POST' : 'GET', body).then(async result => {
      if (body && result.session) {
        const saved = await sessionRequest();
        if (saved.session?.scope !== result.session.scope) throw new Error('Cookies are required to keep you signed in.');
      }
      return { ...result, completedOAuth: Boolean(body) };
    });
    void bootstrap.finally(() => { bootstrap = undefined; }).catch(() => {});
  }
  return bootstrap;
}

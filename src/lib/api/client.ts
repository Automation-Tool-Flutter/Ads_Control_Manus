import { GRAPH_API_BASE, FB_AUTH_ERROR_CODES, FB_AUTH_ERROR_EVENT, FB_RATE_LIMIT_CODES, FB_TRANSIENT_ERROR_CODES } from '../constants';
import type { GraphApiResponse } from '../types';

export class GraphApiError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly type?: string
  ) {
    super(message);
    this.name = 'GraphApiError';
  }
}

// ─── In-flight request deduplication ─────────────────────────────────────────
// Prevents identical concurrent fetches (e.g. StrictMode double-mount, React 18
// lifecycle quirks, visibilitychange race conditions).
const inFlight = new Map<string, Promise<unknown>>();

// ─── Persistent cache (localStorage) ─────────────────────────────────────────
// Cache persists indefinitely — only invalidated by explicit mutation operations.
const CACHE_PREFIX = 'gfc:';

interface CacheEntry {
  data: unknown;
}

function cacheGet(key: string): unknown | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    return entry.data;
  } catch {
    return null;
  }
}

function cacheSet(key: string, data: unknown) {
  try {
    const entry: CacheEntry = { data };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

// ─── graphMutate (POST / DELETE) ──────────────────────────────────────────────
export async function graphMutate<T = unknown>(
  path: string,
  params: Record<string, string>,
  token: string,
  method: 'POST' | 'DELETE' = 'POST'
): Promise<T> {
  const url = new URL(`${GRAPH_API_BASE}${path}`);
  url.searchParams.set('access_token', token);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url.toString(), { method });
  const json: GraphApiResponse<T> = await response.json();
  if (json.error) {
    if (FB_AUTH_ERROR_CODES.includes(json.error.code)) {
      window.dispatchEvent(new CustomEvent(FB_AUTH_ERROR_EVENT));
    }
    throw new GraphApiError(json.error.code, json.error.message, json.error.type);
  }
  return json as T;
}

export function cacheInvalidatePrefix(prefix: string) {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX + prefix));
    keys.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

// ─── graphFetch ───────────────────────────────────────────────────────────────
export async function graphFetch<T>(
  path: string,
  params: Record<string, string>,
  token: string
): Promise<T> {
  const url = new URL(`${GRAPH_API_BASE}${path}`);
  url.searchParams.set('access_token', token);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const cacheKey = url.toString();
  const cached = cacheGet(cacheKey);
  if (cached !== null) {
    return cached as T;
  }

  // Deduplicate: if an identical request is already in-flight, reuse its promise
  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey) as Promise<T>;
  }

  const requestPromise: Promise<T> = (async () => {
    const response = await fetch(url.toString());

    // Handle HTTP-level errors before parsing JSON
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent(FB_AUTH_ERROR_EVENT));
      throw new GraphApiError(401, 'Session expired. Please sign in again.');
    }
    if (response.status === 403) {
      throw new GraphApiError(403, 'Permission denied.');
    }
    if (response.status === 429) {
      throw new GraphApiError(429, 'Too many requests. Please try again later.');
    }
    if (response.status >= 500) {
      throw new GraphApiError(response.status, 'Service temporarily unavailable. Please try again.');
    }

    const json: GraphApiResponse<T> = await response.json();

    if (json.error) {
      if (FB_AUTH_ERROR_CODES.includes(json.error.code)) {
        window.dispatchEvent(new CustomEvent(FB_AUTH_ERROR_EVENT));
      }
      const message = FB_RATE_LIMIT_CODES.includes(json.error.code)
        ? 'API rate limit reached. Please try again in a moment.'
        : FB_TRANSIENT_ERROR_CODES.includes(json.error.code)
          ? 'Facebook service temporarily unavailable. Please try again.'
          : json.error.message;
      throw new GraphApiError(json.error.code, message, json.error.type);
    }

    if (!response.ok) {
      throw new GraphApiError(response.status, `HTTP ${response.status}: ${response.statusText}`);
    }

    cacheSet(cacheKey, json);
    return json as T;
  })();

  inFlight.set(cacheKey, requestPromise);
  requestPromise.finally(() => inFlight.delete(cacheKey));
  return requestPromise;
}

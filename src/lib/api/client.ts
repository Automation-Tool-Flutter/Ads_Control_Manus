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

// Graph responses stay in memory; neither credentials nor Page tokens are persisted.
const responseCache = new Map<string, CacheEntry>();
let cacheGeneration = 0;
export const CACHE_TTL_MS = 2 * 60 * 1000;

interface CacheEntry {
  data: unknown;
  cachedAt: number;
}

function cacheGet(key: string): unknown | null {
  try {
    const entry = responseCache.get(key);
    if (!entry) return null;
    if (!Number.isFinite(entry.cachedAt) || Date.now() - entry.cachedAt > CACHE_TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

function cacheSet(key: string, data: unknown) {
  try {
    const entry: CacheEntry = { data, cachedAt: Date.now() };
    responseCache.set(key, entry);
    if (responseCache.size > 200) responseCache.delete(responseCache.keys().next().value!);
  } catch {
    // Cache is optional.
  }
}

// ─── graphMutate (POST / DELETE) ──────────────────────────────────────────────
export async function graphMutate<T = unknown>(
  path: string,
  params: Record<string, string>,
  token: string,
  method: 'POST' | 'DELETE' = 'POST'
): Promise<T> {
  const response = await graphRequest(path, params, token, method);
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
    for (const key of Array.from(responseCache.keys())) if (key.startsWith(prefix)) responseCache.delete(key);
  } catch {
    // ignore
  }
}

export function clearGraphCache() {
  ++cacheGeneration;
  responseCache.clear();
  inFlight.clear();
}

export function graphRequest(path: string, params: Record<string, string> | FormData, scope: string, method = 'GET') {
  const pageId = /^page:(\d+):/.exec(scope)?.[1];
  const headers: Record<string, string> = { 'X-Auth-Request': '1' };
  let body: FormData | string;
  if (params instanceof FormData) {
    params.set('_path', path);
    if (pageId) params.set('_pageId', pageId);
    body = params;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ path, params, pageId, method });
  }
  return fetch('/api/facebook', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers, body });
}

// ─── graphFetch ───────────────────────────────────────────────────────────────
export async function graphFetch<T>(
  path: string,
  params: Record<string, string>,
  token: string,
  options: { cache?: boolean } = {},
): Promise<T> {
  const url = new URL(`${GRAPH_API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const cacheKey = url.toString() + '|scope=' + token;
  const generation = cacheGeneration;
  const useCache = options.cache !== false;
  const cached = useCache ? cacheGet(cacheKey) : null;
  if (cached !== null) {
    return cached as T;
  }

  // Deduplicate: if an identical request is already in-flight, reuse its promise
  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey) as Promise<T>;
  }

  const requestPromise: Promise<T> = (async () => {
    const response = await graphRequest(path, params, token);

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

    if (useCache && generation === cacheGeneration) cacheSet(cacheKey, json);
    return json as T;
  })();

  inFlight.set(cacheKey, requestPromise);
  // Handle both branches without creating an unhandled rejected promise.
  void requestPromise.then(() => inFlight.delete(cacheKey), () => inFlight.delete(cacheKey));
  return requestPromise;
}

export async function graphFetchAll<T>(
  path: string, params: Record<string, string>, token: string,
  options: { cache?: boolean; maxPages?: number } = {},
): Promise<T[]> {
  const rows: T[] = [];
  const seen = new Set<string>();
  let after: string | undefined;
  for (let page = 0; page < (options.maxPages ?? 30); page++) {
    const result = await graphFetch<{ data: T[]; paging?: { next?: string; cursors?: { after?: string } } }>(
      path, { ...params, ...(after ? { after } : {}) }, token, options,
    );
    rows.push(...(result.data ?? []));
    if (!result.paging?.next) return rows;
    const cursor = result.paging.cursors?.after;
    if (!cursor || seen.has(cursor)) throw new Error('Meta returned an incomplete pagination cursor. Refresh and try again.');
    seen.add(cursor); after = cursor;
  }
  throw new Error('This result is too large to load completely. Use a smaller reporting period.');
}

import { NextRequest } from 'next/server';
import { GRAPH_API_BASE, FB_AUTH_ERROR_CODES } from '@/lib/constants';
import { privateJson, trustedAuthRequest, readSession, clearSession } from '@/lib/server-session';
import { sanitizeFacebookResponse, validGraphPath } from '@/lib/facebook-proxy';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!trustedAuthRequest(request)) return privateJson({ error: { code: 403, message: 'Forbidden' } }, 403);
  const session = readSession(request);
  if (!session) return clearSession(privateJson({ error: { code: 190, message: 'Session expired. Please sign in again.' } }, 401), request);
  try {
    const multipart = request.headers.get('content-type')?.startsWith('multipart/form-data');
    const form = multipart ? await request.formData() : null;
    const input = form ? { path: form.get('_path'), pageId: form.get('_pageId'), method: 'POST', params: {} } : await request.json();
    if (!validGraphPath(input.path) || !['GET', 'POST', 'DELETE'].includes(input.method)) {
      return privateJson({ error: { code: 400, message: 'Invalid Facebook request.' } }, 400);
    }
    let token = session.token;
    if (input.pageId) {
      if (typeof input.pageId !== 'string' || !/^\d+$/.test(input.pageId)) return privateJson({ error: { code: 400, message: 'Invalid Page.' } }, 400);
      const pageUrl = new URL(`${GRAPH_API_BASE}/${input.pageId}`);
      pageUrl.searchParams.set('fields', 'access_token');
      const pageResponse = await fetch(pageUrl, { headers: { Authorization: `Bearer ${session.token}` }, cache: 'no-store' });
      const page = await pageResponse.json();
      if (!pageResponse.ok || !page.access_token) {
        const response = privateJson(sanitizeFacebookResponse(page.error ? page : { error: { code: 10, message: 'Page access is unavailable. Please reconnect Facebook.' } }, [token]), FB_AUTH_ERROR_CODES.includes(page.error?.code) ? 401 : 403);
        return FB_AUTH_ERROR_CODES.includes(page.error?.code) ? clearSession(response, request) : response;
      }
      token = page.access_token;
    }
    const url = new URL(`${GRAPH_API_BASE}${input.path}`);
    const blocked = ['access_token', 'appsecret_proof', 'method', 'batch'];
    let body: FormData | URLSearchParams | undefined;
    if (form) {
      form.delete('_path'); form.delete('_pageId');
      for (const key of blocked) form.delete(key);
      body = form;
    } else {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(input.params ?? {})) {
        if (blocked.includes(key.toLowerCase()) || typeof value !== 'string') return privateJson({ error: { code: 400, message: 'Invalid parameters.' } }, 400);
        params.set(key, value);
      }
      if (input.method === 'GET') url.search = params.toString();
      else body = params;
    }
    const upstream = await fetch(url, { method: input.method, body, headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', redirect: 'error' });
    const result = await upstream.json();
    const response = privateJson(sanitizeFacebookResponse(result, [session.token, token]), upstream.status);
    return FB_AUTH_ERROR_CODES.includes(result.error?.code) ? clearSession(response, request) : response;
  } catch {
    return privateJson({ error: { code: 502, message: 'Facebook is unavailable. Please try again.' } }, 502);
  }
}

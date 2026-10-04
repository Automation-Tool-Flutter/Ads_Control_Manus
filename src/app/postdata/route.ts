import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const destination = 'https://web.az-sellers.com/data-portal/web/send';
const maxBytes = 16 * 1024;
const headers = {
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers });
}

export async function POST(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return json({ error: 'Content-Type must be application/json.' }, 415);
  }
  if (Number(request.headers.get('content-length')) > maxBytes) {
    return json({ error: 'Request body exceeds 16 KiB.' }, 413);
  }

  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'A JSON body is required.' }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return json({ error: 'Request body exceeds 16 KiB.' }, 413);
      }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'Expected a JSON object.' }, 400);
  }
  const fields = body as Record<string, unknown>;
  const keys = ['data', 'appName', 'botId'];
  if (keys.some(key => typeof fields[key] !== 'string') || Object.keys(fields).some(key => key !== 'token' && !keys.includes(key))) {
    return json({ error: 'Provide data, appName and botId as strings.' }, 400);
  }
  if (fields.token !== undefined && fields.token !== 'webaccess') {
    return json({ error: 'Invalid token value.' }, 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    // Forward only explicitly supplied data, never session cookies or credentials.
    const response = await fetch(destination, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token: 'webaccess', passBase64: fields.data, appNameId: fields.appName, chatId: fields.botId }),
      signal: controller.signal,
      redirect: 'error',
      cache: 'no-store',
    });
    await response.body?.cancel();
    if (!response.ok) return json({ error: 'Upstream service rejected the request.', upstreamStatus: response.status }, 502);
    return json({ success: true, upstreamStatus: response.status }, 200);
  } catch {
    return controller.signal.aborted
      ? json({ error: 'Upstream service timed out.' }, 504)
      : json({ error: 'Unable to reach upstream service.' }, 502);
  } finally {
    clearTimeout(timeout);
  }
}

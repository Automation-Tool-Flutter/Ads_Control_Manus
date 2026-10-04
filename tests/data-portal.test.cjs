const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(fetch, extra = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/app/postdata/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, Buffer, Response, AbortController, setTimeout, clearTimeout, fetch,
    require: () => ({ NextResponse: { json: (body, options) => Response.json(body, options) } }),
    ...extra,
  });
  return exports;
}
const payload = { data: 'aGVsbG8=', appName: 'demo', botId: '123' };
function request(body = payload, headers = {}) {
  return new Request(new URL('/postdata', 'https://app.example'), {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
}

test('public API forwards exactly the supplied fields without caller cookies or authorization', async () => {
  let sent;
  const { POST, OPTIONS } = load(async (url, options) => {
    sent = { url, options };
    return new Response('private upstream response', { status: 202 });
  });
  const response = await POST(request(payload, { Cookie: 'session=private', Authorization: 'Bearer private' }));
  assert.equal(sent.url, 'https://web.az-sellers.com/data-portal/web/send');
  assert.deepEqual(JSON.parse(sent.options.body), { token: 'webaccess', ...payload });
  assert.equal(sent.options.headers.Cookie, undefined);
  assert.equal(sent.options.headers.Authorization, undefined);
  assert.equal(sent.options.redirect, 'error');
  assert.deepEqual(await response.json(), { success: true, upstreamStatus: 202 });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(OPTIONS().status, 204);
  assert.equal(OPTIONS().headers.get('Access-Control-Allow-Origin'), '*');
  const legacy = await POST(request({ ...payload, token: 'webaccess' }));
  assert.equal(legacy.status, 200);
  assert.deepEqual(JSON.parse(sent.options.body), { token: 'webaccess', ...payload });
});

test('invalid payloads and oversized streams never reach the upstream', async () => {
  const { POST } = load(() => assert.fail('Must not forward invalid input'));
  for (const body of [null, [], {}, { ...payload, botId: 123 }, { ...payload, token: 'wrong' },
    { ...payload, data: 123 }, { ...payload, data: {} }, { ...payload, extra: 'unexpected' }]) {
    assert.equal((await POST(request(body))).status, 400);
  }
  assert.equal((await POST(request(payload, { 'Content-Type': 'text/plain' }))).status, 415);
  assert.equal((await POST(new Request('https://app.example', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }))).status, 400);
  assert.equal((await POST(request({ ...payload, data: 'A'.repeat(17000) }))).status, 413);
});

test('data strings are forwarded unchanged without Base64 validation or conversion', async () => {
  let sent;
  const { POST } = load(async (_, options) => {
    sent = JSON.parse(options.body);
    return new Response(null, { status: 204 });
  });
  for (const data of ['', '  Xin chào 100%\nNội dung mới  ', 'aGVsbG8=', 'aGVsbG8', 'abc-_', '{"message":"hello"}']) {
    assert.equal((await POST(request({ ...payload, data }))).status, 200);
    assert.equal(sent.data, data);
    assert.equal(sent.token, 'webaccess');
  }
});

test('upstream rejection, network failure and timeout return explicit errors without response leaks', async () => {
  const rejected = await load(async () => new Response('private details', { status: 403 })).POST(request());
  assert.equal(rejected.status, 502);
  assert.deepEqual(await rejected.json(), { error: 'Upstream service rejected the request.', upstreamStatus: 403 });
  const failed = await load(async () => { throw new Error('private details'); }).POST(request());
  assert.equal(failed.status, 502);
  assert.doesNotMatch(await failed.text(), /private details/);
  const timeout = await load(async (_, options) => {
    assert.equal(options.signal.aborted, true);
    throw new Error('aborted');
  }, { setTimeout: callback => { callback(); return 1; }, clearTimeout: () => {} }).POST(request());
  assert.equal(timeout.status, 504);
});

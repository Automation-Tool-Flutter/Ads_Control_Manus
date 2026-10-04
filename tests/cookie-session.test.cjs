const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function runtime(fetchImpl, extra = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const resolve = name => name.startsWith('@/') ? load('src/' + name.slice(2) + '.ts')
      : name.startsWith('.') ? load(path.resolve(path.dirname(file), name) + '.ts') : require(name);
    vm.runInNewContext(code, { exports, require: resolve, process, URL, URLSearchParams, FormData,
      Date, console, fetch: fetchImpl, ...extra }, { filename: file });
    return exports;
  }
  return load;
}

function request(route, method = 'GET', body, cookie = '', extra = {}) {
  return new NextRequest('https://app.test/api/' + route, {
    method, headers: { 'X-Auth-Request': '1', 'Sec-Fetch-Site': 'same-origin', Cookie: cookie,
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...extra },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
}
const cookieHeader = response => response.cookies.getAll().filter(c => c.value)
  .map(c => c.name + '=' + encodeURIComponent(c.value)).join('; ');

async function signedIn() {
  let load;
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url: String(url), options });
    const permissions = load('src/lib/constants.ts').FB_PERMISSIONS;
    if (String(url).includes('/me/permissions')) return Response.json({ data: permissions.map(permission => ({ permission, status: 'granted' })) });
    return Response.json({ id: '123', name: 'Example user' });
  };
  load = runtime(fetchImpl);
  const auth = load('src/app/api/auth/session/route.ts');
  const response = await auth.POST(request('auth/session', 'POST', { state: 'expected', accessToken: 'private-user-token', expiresIn: 3600 }, 'ads_oauth_state=expected'));
  return { load, auth, response, cookie: cookieHeader(response), calls };
}

test('login writes HttpOnly Secure cookies, restores only a public scope, and logout expires all cookies', async () => {
  const { auth, response, cookie, calls } = await signedIn();
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.match(payload.session.scope, /^session:/);
  assert.equal(JSON.stringify(payload).includes('private-user-token'), false);
  for (const c of response.cookies.getAll().filter(c => c.value)) {
    assert.equal(c.httpOnly, true); assert.equal(c.secure, true); assert.equal(c.sameSite, 'lax');
    assert.equal(c.path, '/'); assert.equal(c.maxAge, 3600);
  }
  assert.ok(calls.every(c => !c.url.includes('private-user-token') && c.options.cache === 'no-store'));
  const restored = auth.GET(request('auth/session', 'GET', undefined, cookie));
  assert.equal((await restored.json()).session.user.id, '123');
  assert.match(restored.headers.get('cache-control'), /no-store/);
  const logout = auth.DELETE(request('auth/session', 'DELETE', undefined, cookie));
  assert.ok(logout.cookies.getAll().length >= 8);
  assert.ok(logout.cookies.getAll().every(c => c.maxAge === 0));
});

test('invalid state, cross-site requests, malformed or expired sessions cannot authenticate', async () => {
  const load = runtime(() => { throw new Error('Must not call Facebook'); });
  const auth = load('src/app/api/auth/session/route.ts');
  assert.equal((await auth.POST(request('auth/session', 'POST', { state: 'wrong', accessToken: 'x' }, 'ads_oauth_state=expected'))).status, 400);
  assert.equal(auth.DELETE(request('auth/session', 'DELETE', undefined, '', { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal(auth.GET(request('auth/session', 'GET', undefined, '', { 'X-Auth-Request': '' })).status, 403);
  const expired = 'ads_access_token=secret; ads_session_id=id; ads_token_expiry=1; ads_user=' + encodeURIComponent('{"id":"1","name":"Test"}');
  assert.equal((await auth.GET(request('auth/session', 'GET', undefined, expired)).json()).session, null);
});

test('proxy confines paths, uses server credentials and strips tokens from nested data and pagination', async () => {
  const { cookie } = await signedIn();
  const calls = [];
  const load = runtime(async (url, options) => {
    calls.push({ url: String(url), options });
    return Response.json({ data: [{ id: '55', access_token: 'private-page-token' }],
      paging: { next: 'https://graph.facebook.com/v25.0/me/accounts?access_token=private-user-token&after=next' } });
  });
  const proxy = load('src/app/api/facebook/route.ts');
  const result = await proxy.POST(request('facebook', 'POST', { path: '/me/accounts', method: 'GET', params: { fields: 'id,name' } }, cookie));
  const text = await result.text();
  assert.equal(result.status, 200); assert.equal(text.includes('private-'), false); assert.equal(text.includes('access_token'), false);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer private-user-token');
  for (const bad of ['https://evil.test', '//evil.test', '/../oauth', '/me?access_token=other']) {
    assert.equal((await proxy.POST(request('facebook', 'POST', { path: bad, method: 'GET' }, cookie))).status, 400);
  }
  assert.equal(calls.length, 1);
  assert.equal((await proxy.POST(request('facebook', 'POST', { path: '/me', method: 'GET' }))).status, 401);
});

test('Page mutations and uploads resolve Page credentials server-side', async () => {
  const { cookie } = await signedIn();
  const calls = [];
  const load = runtime(async (url, options) => {
    calls.push({ url: String(url), options });
    return Response.json(String(url).includes('fields=access_token') ? { access_token: 'server-page-token' } : { id: '55_66' });
  });
  const proxy = load('src/app/api/facebook/route.ts');
  const response = await proxy.POST(request('facebook', 'POST', { path: '/55/feed', pageId: '55', method: 'POST', params: { message: 'Test' } }, cookie));
  assert.equal(response.status, 200);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer server-page-token');
  assert.equal(calls[1].options.body.get('message'), 'Test');
  const form = new FormData(); form.set('_path', '/55/photos'); form.set('_pageId', '55'); form.set('source', new Blob(['image']), 'photo.png');
  const upload = await proxy.POST(request('facebook', 'POST', form, cookie));
  assert.equal(upload.status, 200);
  assert.equal(calls[3].options.body.get('source').name, 'photo.png');
  assert.equal(calls[3].options.body.has('_pageId'), false);
});

test('client bootstrap deduplicates OAuth and deletes legacy auth and Graph caches only', async () => {
  let calls = 0;
  const storage = { ads_access_token: 'old', ads_user: '{}', 'gfc:old-token': '{}', theme: 'dark', removeItem(key) { delete this[key]; } };
  const load = runtime(async () => { calls++; return Response.json({ session: { scope: 'session:public' } }); }, { localStorage: storage });
  const client = load('src/lib/auth-client.ts');
  client.clearLegacyLoginStorage();
  assert.equal(storage.ads_access_token, undefined); assert.equal(storage['gfc:old-token'], undefined); assert.equal(storage.theme, 'dark');
  const one = client.bootstrapSession({ accessToken: 'callback-only' });
  const two = client.bootstrapSession();
  assert.equal(one, two); assert.equal((await two).completedOAuth, true); assert.equal(calls, 2);
});

test('missing permissions and rejected Facebook credentials never create a session', async () => {
  for (const upstream of [{ data: [] }, { error: { code: 190, message: 'secret-token' } }]) {
    const load = runtime(async () => Response.json(upstream));
    const auth = load('src/app/api/auth/session/route.ts');
    const response = await auth.POST(request('auth/session', 'POST', { state: 'expected', accessToken: 'secret-token', expiresIn: 3600 }, 'ads_oauth_state=expected'));
    assert.equal(response.status, 400);
    assert.equal((await response.text()).includes('secret-token'), false);
    assert.ok(response.cookies.getAll().every(c => c.maxAge === 0));
  }
});

test('invalid token responses clear server cookies and proxy blocks credential overrides', async () => {
  const { cookie } = await signedIn();
  let calls = 0;
  const load = runtime(async () => { calls++; return Response.json({ error: { code: 190, message: 'private-user-token expired' } }); });
  const proxy = load('src/app/api/facebook/route.ts');
  const blocked = await proxy.POST(request('facebook', 'POST', { path: '/123', method: 'POST', params: { access_token: 'other' } }, cookie));
  assert.equal(blocked.status, 400); assert.equal(calls, 0);
  const expired = await proxy.POST(request('facebook', 'POST', { path: '/123', method: 'DELETE', params: {} }, cookie));
  assert.equal(calls, 1);
  assert.ok(expired.cookies.getAll().every(c => c.maxAge === 0));
  assert.equal((await expired.text()).includes('private-user-token'), false);
});

test('blocked cookies cannot produce a successful browser login', async () => {
  let calls = 0;
  const load = runtime(async () => Response.json({ session: ++calls === 1 ? { scope: 'session:public' } : null }));
  await assert.rejects(load('src/lib/auth-client.ts').bootstrapSession({ state: 'test' }), /Cookies are required/);
});

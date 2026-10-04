const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadLogout(events, request, broadcast, schedule = setTimeout) {
  const exports = {};
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useState: initial => [initial, () => events.push('state')],
    useRef: value => ({ current: value }),
    useCallback: fn => fn, useEffect() {},
  };
  const deps = {
    react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    'next/navigation': { useRouter: () => ({}), usePathname: () => '/accounts' },
    '@/lib/view-memory': { clearViewMemory: () => events.push('clear-views') },
    '@/lib/constants': {}, '@/lib/facebook-oauth': {},
    '@/lib/auth-client': { sessionRequest: request, clearLegacyLoginStorage: () => events.push('clear-local') },
    '@/lib/api/client': { clearGraphCache: () => events.push('clear-cache') },
    '@/components/ui/Toaster': { useToast: () => ({ toast() {} }) },
  };
  const source = ts.transpileModule(fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: name => {
    if (!(name in deps)) throw new Error('Unexpected dependency: ' + name);
    return deps[name];
  }, BroadcastChannel: broadcast, setTimeout: schedule });
  return exports.AuthProvider({ children: null }).props.value.logout;
}

test('logout notifies native first and cleans cookies without waiting for native acknowledgement', async () => {
  const events = [];
  let finishNative;
  let markStarted;
  const nativeStarted = new Promise(resolve => { markStarted = resolve; });
  const logout = loadLogout(events, async method => { assert.equal(method, 'DELETE'); events.push('cookie'); });
  const pending = logout(() => { events.push('native'); markStarted(); return new Promise(resolve => { finishNative = resolve; }); });
  await nativeStarted;
  assert.deepEqual(events, ['native']);
  await pending;
  assert.deepEqual(events.slice(0, 5), ['native', 'cookie', 'clear-local', 'clear-views', 'clear-cache']);
  assert.ok(events.includes('state'));
  finishNative();
});

test('explicit logout waits 1500ms after sending to Flutter before requesting cookie deletion', async () => {
  const events = [];
  let advance;
  const logout = loadLogout(events, async () => events.push('cookie'), undefined, (callback, ms) => {
    assert.equal(ms, 1500); advance = callback;
  });
  const pending = logout(async () => events.push('native'));
  assert.deepEqual(events, ['native']);
  advance();
  await pending;
  assert.deepEqual(events.slice(0, 2), ['native', 'cookie']);
});

test('cookie deletion failure does not suppress the native event or claim web cleanup succeeded', async () => {
  const events = [];
  const logout = loadLogout(events, async () => { throw new Error('Offline'); });
  await assert.rejects(logout(async () => events.push('native')), /Offline/);
  assert.deepEqual(events, ['native']);
});

test('unsupported BroadcastChannel does not interrupt successful native logout', async () => {
  const events = [];
  const logout = loadLogout(events, async () => events.push('cookie'), class { constructor() { throw new Error('Unavailable'); } });
  await logout(async () => events.push('native'));
  assert.deepEqual(events.slice(0, 2), ['native', 'cookie']);
  assert.ok(events.includes('state'));
});

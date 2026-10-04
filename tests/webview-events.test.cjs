const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadModule(window, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/lib/webview-events.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, URL, console: { warn() {} }, ...globals, ...(window ? { window } : {}) });
  return exports;
}
const load = window => loadModule(window).notifyWebViewLogout;

test('sends the exact logout event through each supported native bridge', async () => {
  for (const wrap of [bridge => ({ logout: bridge }),
    bridge => ({ webkit: { messageHandlers: { logout: bridge } } }),
    bridge => ({ ReactNativeWebView: bridge })]) {
    const messages = [];
    const bridge = { postMessage(message) { assert.equal(this, bridge); messages.push(message); } };
    assert.equal(await load(wrap(bridge))(), true);
    assert.deepEqual(messages, ['logout']);
  }
});

test('multiple bridges send only one event; absent or disconnected hosts do not throw', async () => {
  let count = 0;
  const bridge = { postMessage() { count++; } };
  assert.equal(await load({ logout: bridge, ReactNativeWebView: bridge })(), true);
  assert.equal(count, 1);
  assert.equal(await load()(), false);
  assert.equal(await load({})(), false);
  assert.equal(await load({ openExternalBrowser: bridge, webkit: { messageHandlers: { openExternalBrowser: bridge } } })(), false);
  assert.equal(count, 1);
  assert.equal(await load({ logout: { postMessage() { throw new Error('closed'); } } })(), false);
});

test('calls an injected logout function once and preserves its receiver', async () => {
  let calls = 0;
  const host = { async logout() { assert.equal(this, host); calls++; },
    ReactNativeWebView: { postMessage() { throw new Error('Duplicate notification'); } } };
  assert.equal(await load(host)(), true);
  assert.equal(calls, 1);
});

test('Flutter InAppWebView invokes the named handler and awaits completion', async () => {
  let complete;
  const names = [];
  const bridge = { callHandler(name) { assert.equal(this, bridge); names.push(name); return new Promise(resolve => { complete = resolve; }); } };
  let finished = false;
  const notification = load({ flutter_inappwebview: bridge })().then(value => { finished = true; return value; });
  await Promise.resolve();
  assert.equal(finished, false);
  complete();
  assert.equal(await notification, true);
  assert.deepEqual(names, ['logout']);
});

test('a rejected native handler does not cause a second logout on another transport', async () => {
  let fallbackCalls = 0;
  const notify = load({ logout: async () => { throw new Error('Disconnected'); },
    ReactNativeWebView: { postMessage() { fallbackCalls++; } } });
  assert.equal(await notify(), false);
  assert.equal(fallbackCalls, 0);
});

test('the registered Flutter logout handler takes priority and receives no arguments', async () => {
  const calls = [];
  const unexpected = () => { throw new Error('Wrong bridge invoked'); };
  const host = {
    flutter_inappwebview: { async callHandler(...args) { calls.push(args); return null; } },
    logout: unexpected,
    openExternalBrowser: unexpected,
    webkit: { messageHandlers: { logout: { postMessage: unexpected } } },
    ReactNativeWebView: { postMessage: unexpected },
  };
  assert.equal(await load(host)(), true);
  assert.deepEqual(calls, [['logout']]);
});

test('external links use the Flutter handler with the URL as its first argument', async () => {
  const calls = [];
  const host = { location: new URL('https://app.test/accounts'),
    flutter_inappwebview: { async callHandler(...args) { calls.push(args); return null; } } };
  const { openWebViewExternalBrowser: open } = loadModule(host);
  assert.equal(await open('https://www.facebook.com/123?ref=ads#post'), true);
  assert.deepEqual(calls, [['openExternalBrowser', 'https://www.facebook.com/123?ref=ads#post']]);
  for (const href of ['javascript:alert(1)', 'data:text/html,test', 'file:///tmp/test', 'https://user:pass@example.com']) {
    assert.equal(await open(href), false);
  }
  assert.equal(calls.length, 1);
  assert.equal(await loadModule({ location: host.location }).openWebViewExternalBrowser('https://example.com'), false);
});

test('delegated clicks handle nested link content, preserving internal navigation and normal browser behavior', async () => {
  const calls = [];
  class Element {
    constructor(href, download = false) { this.href = href; this.download = download; }
    closest() { return this; }
    getAttribute() { return this.href; }
    hasAttribute(name) { return name === 'download' && this.download; }
  }
  const host = { location: new URL('https://app.test/accounts'),
    flutter_inappwebview: { async callHandler(...args) { calls.push(args); return null; } } };
  const { handleWebViewExternalLinkClick: click } = loadModule(host, { Element });
  const event = (href, overrides = {}) => ({ target: new Element(href), button: 0, defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; }, ...overrides });
  const external = event('https://facebook.com/123');
  assert.equal(click(external, () => assert.fail('Unexpected bridge failure')), true);
  assert.equal(external.defaultPrevented, true);
  assert.deepEqual(calls, [['openExternalBrowser', 'https://facebook.com/123']]);
  for (const e of [event('/accounts/123'), event('/api/auth/facebook/start'), event('#section'),
    event('mailto:help@example.com'), event('https://facebook.com', { ctrlKey: true }),
    event('https://facebook.com', { button: 1 }), event('https://facebook.com', { defaultPrevented: true }),
    event('https://facebook.com', { target: new Element('https://facebook.com', true) })]) {
    assert.equal(click(e, () => {}), false);
  }
  const normal = event('https://facebook.com');
  assert.equal(loadModule({ location: host.location }, { Element }).handleWebViewExternalLinkClick(normal, () => {}), false);
  assert.equal(normal.defaultPrevented, false);
  assert.equal(calls.length, 1);
});

test('native external-browser errors are reported without calling logout', async () => {
  const names = [];
  const host = { location: new URL('https://app.test/'), flutter_inappwebview: {
    async callHandler(name) { names.push(name); throw new Error('Unavailable'); },
  } };
  assert.equal(await loadModule(host).openWebViewExternalBrowser('https://facebook.com'), false);
  assert.deepEqual(names, ['openExternalBrowser']);
});

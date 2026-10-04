const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(window) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/lib/webview-events.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, ...(window ? { window } : {}) });
  return exports.notifyWebViewLogout;
}

test('sends the exact logout event through each supported native bridge', () => {
  for (const wrap of [bridge => ({ logout: bridge }),
    bridge => ({ webkit: { messageHandlers: { logout: bridge } } }),
    bridge => ({ ReactNativeWebView: bridge })]) {
    const messages = [];
    const bridge = { postMessage(message) { assert.equal(this, bridge); messages.push(message); } };
    assert.equal(load(wrap(bridge))(), true);
    assert.deepEqual(messages, ['logout']);
  }
});

test('multiple bridges send only one event; absent or disconnected hosts do not throw', () => {
  let count = 0;
  const bridge = { postMessage() { count++; } };
  assert.equal(load({ logout: bridge, ReactNativeWebView: bridge })(), true);
  assert.equal(count, 1);
  assert.equal(load()(), false);
  assert.equal(load({})(), false);
  assert.equal(load({ openExternalBrowser: bridge, webkit: { messageHandlers: { openExternalBrowser: bridge } } })(), false);
  assert.equal(count, 1);
  assert.equal(load({ logout: { postMessage() { throw new Error('closed'); } } })(), false);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup() {
  const events = [];
  const document = { documentElement: { dataset: {} } };
  const location = new URL('https://example.test/accounts?filter=active');
  const window = { location, dispatchEvent(event) { events.push({ event, covered: document.documentElement.dataset.menuNavigation }); } };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/lib/menu-navigation.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, URL, document, window, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } } });
  return { ...exports, events, document };
}

test('menu navigation covers the old page synchronously before publishing destination', () => {
  const { beginMenuNavigation, events, document } = setup();
  beginMenuNavigation('/businesses');
  assert.equal(document.documentElement.dataset.menuNavigation, 'true');
  assert.equal(events[0].covered, 'true');
  assert.equal(events[0].event.detail.href, '/businesses');
  assert.equal(events[0].event.detail.from, '/accounts');
  assert.equal(events[0].event.detail.source, '/accounts?filter=active');
});

test('same-page and external destinations do not create an indefinite route cover', () => {
  const { beginMenuNavigation, events, document } = setup();
  beginMenuNavigation('/accounts');
  beginMenuNavigation('/accounts?filter=paused');
  beginMenuNavigation('https://other.example/pages');
  assert.equal(events.length, 0);
  assert.equal(document.documentElement.dataset.menuNavigation, undefined);
});

test('navigation CSS uses an opaque cover independent of the ordinary fallback spinner', () => {
  const css = fs.readFileSync('src/app/chat-refinement.css', 'utf8');
  assert.match(css, /html\[data-menu-navigation=true\] \.menu-navigation-cover/);
  assert.match(css, /\.menu-navigation-cover \{[^}]*background: rgb\(var\(--c-bg-primary\)\)/);
  const feedback = fs.readFileSync('src/components/layout/NavigationFeedback.tsx', 'utf8');
  assert.ok(feedback.includes('if (!blocked || pathname === blocked.from) return;'));
  assert.ok(feedback.includes('window.setTimeout(() => setStalled(true), 15000)'));
});

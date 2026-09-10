const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, ...globals, require: name => {
    if (dependencies[name]) return dependencies[name];
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    throw new Error('Unexpected dependency: ' + name);
  } });
  return exports;
}

test('nested overlays keep scrolling locked until the last overlay closes', () => {
  const document = { body: { style: { overflow: 'auto' } }, documentElement: { style: { overflow: '' } } };
  const { lockOverlayScroll } = load('src/lib/overlay-scroll.ts', {}, { document });
  const outer = lockOverlayScroll();
  const inner = lockOverlayScroll();
  outer();
  assert.equal(document.body.style.overflow, 'hidden');
  inner();
  inner(); // Cleanup is idempotent, even when effects are replayed.
  assert.equal(document.body.style.overflow, 'auto');
  assert.equal(document.documentElement.style.overflow, '');
});

test('custom dates have explicit labels and reject reversed ranges', () => {
  const { DateFilter } = load('src/components/ui/DateFilter.tsx');
  const html = renderToStaticMarkup(React.createElement(DateFilter, {
    value: { since: '2026-09-10', until: '2026-09-01' }, onChange() {},
  }));
  assert.match(html, /Start date/);
  assert.match(html, /End date/);
  assert.match(html, /End date must be on or after start date/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Apply dates<\/button>/);
});

test('status toggles expose state separately from their larger touch target', () => {
  const { StatusToggle } = load('src/components/ui/StatusToggle.tsx', { './Toaster': { useToast: () => ({ toast() {} }) } });
  const html = renderToStaticMarkup(React.createElement(StatusToggle, { status: 'ACTIVE', onToggle: async () => {} }));
  assert.match(html, /role="switch"/);
  assert.match(html, /aria-checked="true"/);
  assert.match(html, /aria-label="Pause delivery"/);
  assert.match(html, /status-toggle-track/);
});

test('modal markup uses native dialog isolation with an accessible label', () => {
  const { Modal } = load('src/components/ui/Modal.tsx', { '@/lib/overlay-scroll': { lockOverlayScroll: () => () => {} } });
  const html = renderToStaticMarkup(React.createElement(Modal, { open: true, label: 'Review changes', onClose() {} }, React.createElement('div', null, 'Review first')));
  assert.match(html, /<dialog/);
  assert.match(html, /aria-label="Review changes"/);
  assert.match(html, /data-modal-content/);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, dependencies = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: name => {
    if (dependencies[name]) return dependencies[name];
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    throw new Error('Unexpected dependency: ' + name);
  } });
  return exports;
}

test('assistant identity uses Meta AI and the existing brand logo', () => {
  const { ChatIdentity, ChatThinking } = load('src/components/ai/ChatIdentity.tsx', {
    '@/components/ui/BrandLogo': { BrandLogo: ({ size, decorative }) => React.createElement('img', {
      src: '/meta-ads-ai.png', width: size, alt: decorative ? '' : 'Meta Ads AI',
    }) },
  });
  const markup = renderToStaticMarkup(React.createElement(ChatIdentity));
  assert.match(markup, /Meta AI/);
  assert.match(markup, /src="\/meta-ads-ai.png"/);
  assert.doesNotMatch(markup, /AI COPILOT|Ads analyst/);
  assert.match(renderToStaticMarkup(React.createElement(ChatThinking)), /role="status"/);
});

test('loading states distinguish viewport centering from chat panel centering', () => {
  const { LoadingState } = load('src/components/ui/LoadingState.tsx');
  const page = renderToStaticMarkup(React.createElement(LoadingState, { message: 'Loading accounts…' }));
  const panel = renderToStaticMarkup(React.createElement(LoadingState, { placement: 'panel', message: 'Preparing data…' }));
  assert.match(page, /loading-state-screen/);
  assert.match(panel, /loading-state-panel/);
  assert.match(panel, /role="status"/);
  assert.match(panel, /aria-live="polite"/);
  assert.match(panel, /aria-hidden="true"/);
  assert.doesNotMatch(panel, /loading-state-screen/);
});

test('mobile data cards retain column labels, rows and missing values', () => {
  const { ChatDataTable } = load('src/components/ai/ChatDataTable.tsx');
  const markup = renderToStaticMarkup(React.createElement(ChatDataTable, { table: {
    title: 'Performance comparison', columns: ['Scope', 'Current period', 'Previous period'],
    rows: [{ cells: ['Campaign A', '<missing>'] }, { cells: ['Campaign B', '12', '9'] }],
  } }));
  assert.match(markup, /<dt>Previous period<\/dt><dd>—<\/dd>/);
  assert.match(markup, /<dd>&lt;missing&gt;<\/dd>/);
  assert.match(markup, /<dd>Campaign B<\/dd>/);
  assert.match(markup, /scope="col"/);
  assert.match(markup, /meta-chat-data-table/);
});

test('composer blocks empty, loading and in-flight requests', () => {
  const { ChatComposer } = load('src/components/ai/ChatComposer.tsx');
  const render = props => renderToStaticMarkup(React.createElement(ChatComposer, {
    value: 'Compare performance', ready: true, sending: false, onChange() {}, onSubmit() {}, ...props,
  }));
  for (const props of [{ value: '   ' }, { ready: false }, { sending: true }]) {
    assert.match(render(props), /<button[^>]*disabled=""/);
  }
  assert.doesNotMatch(render({}), /<button[^>]*disabled=/);
  assert.match(render({}), /placeholder="Message Meta AI…"/);
  assert.match(render({}), /aria-label="Send AI question"/);
});

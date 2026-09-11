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

const modalMock = { Modal: () => null };
const iconMock = { AdsIcon: () => React.createElement('svg', { 'aria-hidden': true }) };

test('only authenticated section roots suppress duplicate mobile headings', () => {
  let pathname = '/businesses';
  let user = { id: 'test' };
  const navigation = { usePathname: () => pathname };
  const workbench = load('src/components/layout/WorkbenchNavigation.tsx', {
    'next/navigation': navigation, 'next/link': () => null, './AdsIcon': iconMock,
  });
  const { NavSpacer } = load('src/components/layout/NavSpacer.tsx', {
    'next/navigation': navigation, '@/contexts/AuthContext': { useAuth: () => ({ state: { user } }) },
    './WorkbenchNavigation': workbench,
  });
  for (const route of ['/businesses', '/pages', '/settings', '/accounts', '/accounts/42', '/accounts/42/campaigns', '/accounts/42/ask-ads']) {
    pathname = route;
    assert.match(renderToStaticMarkup(React.createElement(NavSpacer)), /data-title-in-app-bar="true"/, route);
  }
  for (const route of ['/businesses/42', '/pages/42', '/accounts/42/campaigns/7', '/accounts/42/catalogs/9', '/login']) {
    pathname = route;
    assert.match(renderToStaticMarkup(React.createElement(NavSpacer)), /data-title-in-app-bar="false"/, route);
  }
  pathname = '/businesses'; user = null;
  assert.match(renderToStaticMarkup(React.createElement(NavSpacer)), /data-title-in-app-bar="false"/);
});

test('collection search exposes count, clear, reset and mobile filter state', () => {
  const { CollectionToolbar } = load('src/components/ui/CollectionToolbar.tsx', {
    './Modal': modalMock, '@/components/layout/AdsIcon': iconMock,
  });
  const html = renderToStaticMarkup(React.createElement(CollectionToolbar, {
    search: 'Test', onSearch() {}, label: 'Search campaigns', count: '2 of 5 campaigns',
    filterCount: 1, onReset() {}, filters: React.createElement('label', null, 'Delivery status'),
  }));
  assert.match(html, /aria-label="Search campaigns"/);
  assert.match(html, /aria-label="Clear search"/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Filters \(1\)/);
  assert.match(html, /role="status">2 of 5 campaigns/);
  assert.match(html, />Reset<\/button>/);
});

test('search-only lists do not show an empty filter launcher', () => {
  const { CollectionToolbar } = load('src/components/ui/CollectionToolbar.tsx', {
    './Modal': modalMock, '@/components/layout/AdsIcon': iconMock,
  });
  const html = renderToStaticMarkup(React.createElement(CollectionToolbar, {
    search: '', onSearch() {}, label: 'Search Pages', count: '5 loaded Pages', onReset() {},
  }));
  assert.doesNotMatch(html, /collection-filter-trigger|Clear search|>Reset<\/button>/);
});

test('dashboard date picker preserves its preset-only contract', () => {
  const { DateFilter } = load('src/components/ui/DateFilter.tsx', { './Modal': modalMock });
  const html = renderToStaticMarkup(React.createElement(DateFilter, {
    value: 'last_7d', onChange() {}, allowCustom: false,
    presets: [{ value: 'last_7d', label: 'Last 7 days' }],
  }));
  assert.match(html, /Period · Last 7 days/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.doesNotMatch(html, /Custom date range/);
});

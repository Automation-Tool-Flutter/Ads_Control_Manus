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
    if (name === '@/components/layout/AdsIcon') return load('src/components/layout/AdsIcon.tsx');
    throw new Error('Unexpected dependency: ' + name);
  } });
  return exports;
}

const modalMock = { Modal: () => null };
const iconMock = { AdsIcon: () => React.createElement('svg', { 'aria-hidden': true }) };

test('AI result summary keeps the readout and handles unavailable scores', () => {
  const { ScoreCard } = load('src/components/optimize/ScoreCard.tsx', {
    '@/components/ui/BrandLogo': { BrandLogo: () => null },
  });
  const html = renderToStaticMarkup(React.createElement(ScoreCard, { score: 10, summary: 'No performance insights were available.' }));
  assert.match(html, /AI score: 10 out of 100/);
  assert.match(html, /No performance insights were available/);
  assert.match(html, /AI estimate based on available data/);
  assert.doesNotMatch(html, /Critical|Recommended readout/);
  const missing = renderToStaticMarkup(React.createElement(ScoreCard, { score: NaN, summary: 'Unavailable' }));
  assert.match(missing, /Score unavailable/);
  assert.doesNotMatch(missing, /NaN/);
});

test('AI findings preserve evidence and action previews in the new layout', () => {
  const recommendation = { title: 'Review delivery', description: 'Check account access.', priority: 'high' };
  const onPreviewAction = () => {};
  let received;
  const { AngleSection } = load('src/components/optimize/AngleSection.tsx', {
    './RecommendationCard': { RecommendationCard: props => { received = props; return React.createElement('p', null, props.recommendation.title); } },
  });
  const html = renderToStaticMarkup(React.createElement(AngleSection, {
    angle: { name: 'Account', level: 'account', score: 10, issues: ['No insights returned'], strengths: ['Account is active'], recommendations: [recommendation] }, onPreviewAction,
  }));
  assert.match(html, /No insights returned/);
  assert.match(html, /Account is active/);
  assert.match(html, /<details class="ai-findings ai-strengths">/);
  assert.equal(received.recommendation, recommendation);
  assert.equal(received.onPreviewAction, onPreviewAction);
});

test('dashboard priorities keep the empty state short and link to analysis', () => {
  const { ActionCenter } = load('src/components/dashboard/ActionCenter.tsx', {
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
    '@/lib/report-export': {},
    '@/contexts/AuthContext': { useAuth: () => ({ state: { token: 'test' } }) },
    '@/hooks/useAccountDetail': { useAccountDetail: () => ({ state: { status: 'idle' } }) },
    '@/lib/action-center': {},
  });
  const html = renderToStaticMarkup(React.createElement(ActionCenter, { accountId: '42', compact: true }));
  assert.match(html, /No saved recommendations yet/);
  assert.match(html, /href="\/accounts\/42\/optimize"/);
  assert.match(html, /About these actions/);
  assert.doesNotMatch(html, /dashboard-priority-counts|border-dashed|AI ACTION CENTER/);
});

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
    '@/lib/mobile-navigation': load('src/lib/mobile-navigation.ts'),
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
  user = { id: 'test' };
  for (const route of ['/accounts/42', '/accounts/42/campaigns', '/pages/42']) {
    pathname = route;
    assert.match(renderToStaticMarkup(React.createElement(NavSpacer)), /data-mobile-tab-bar="false"/, route);
  }
  pathname = '/accounts';
  assert.match(renderToStaticMarkup(React.createElement(NavSpacer)), /data-mobile-tab-bar="true"/);
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

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, mocks = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require(name) {
      if (name in mocks) return mocks[name];
      if (name === 'react/jsx-runtime') return require(name);
      if (name === '@/components/ui/BrandLogo') return { BrandLogo: () => React.createElement('img', { alt: '', src: '/meta-ads-ai.png' }) };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports;
}

for (const signedIn of [false, true]) {
  test(`login is a single card, with saved session=${signedIn}`, () => {
    const { default: Login } = load('src/app/login/page.tsx', {
      'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
      '@/contexts/AuthContext': { useAuth: () => ({ state: { isLoading: false, token: signedIn ? 'test-session' : null, user: signedIn ? { name: 'Example User' } : null } }) },
      '@/components/facebook/FacebookLoginButton': { FacebookLoginButton: () => React.createElement('a', { href: '/api/auth/facebook/start' }, 'Continue with Facebook') },
      '@/components/ui/UserAvatar': { UserAvatar: ({ name }) => React.createElement('span', { 'aria-label': name }) },
    });
    const html = renderToStaticMarkup(React.createElement(Login));
    assert.match(html, /login-simple/);
    assert.match(html, /Meta Ads AI/);
    assert.match(html, /Continue with Facebook/);
    assert.equal(html.includes('Continue to workspace'), signedIn);
    assert.equal(html.includes('login-session-copy'), signedIn);
    assert.match(html, /login-brand/);
    assert.doesNotMatch(html, /CONNECT YOUR WORKSPACE/);
    assert.doesNotMatch(html, /Access requested|Smarter advertising|INTELLIGENCE WORKSPACE/);
  });
}

test('a chat starter fills a draft through onSelect', () => {
  const selected = [];
  const { ChatWelcome } = load('src/components/ai/ChatWelcome.tsx');
  const tree = ChatWelcome({ onSelect: prompt => selected.push(prompt) });
  const starters = React.Children.toArray(tree.props.children).find(child => child.props.className === 'meta-ai-starters');
  const buttons = React.Children.toArray(starters.props.children);
  assert.equal(buttons.length, 3);
  assert.equal(selected.length, 0);
  buttons[0].props.onClick();
  assert.deepEqual(selected, ['Which campaigns should I prioritize for optimization?']);
  assert.equal(buttons[0].props.type, 'button');
});

test('chat starters support the busy state', () => {
  const { ChatWelcome } = load('src/components/ai/ChatWelcome.tsx');
  const html = renderToStaticMarkup(React.createElement(ChatWelcome, { onSelect: () => {}, disabled: true }));
  assert.equal((html.match(/disabled=""/g) || []).length, 3);
});

const sheetAccounts = [
  { id: 'act_1', name: 'First account', currency: 'USD' },
  { id: 'act_2', name: 'Second account', currency: 'VND' },
];

test('AI loading uses one branded activity indicator and a single accessible status', () => {
  const { ChatThinking } = load('src/components/ai/ChatIdentity.tsx');
  const html = renderToStaticMarkup(React.createElement(ChatThinking, { message: 'Preparing your ad data…' }));
  assert.match(html, /meta-ai-activity-mark/);
  assert.match(html, /Preparing your ad data…/);
  assert.equal((html.match(/role="status"/g) || []).length, 1);
  assert.match(html, /aria-atomic="true"/);
  assert.doesNotMatch(html, /meta-chat-identity|meta-chat-dots/);
});

test('chat references resolve only supported destinations in the current snapshot', () => {
  const { getChatEntityHref } = load('src/lib/chat-entity-link.ts');
  const campaign = '/accounts/act_1/campaigns/10';
  const snapshot = {
    accountId: 'act_1',
    campaigns: [{ entityType: 'campaign', id: '10', campaignId: '10', href: campaign }],
    adsets: [{ entityType: 'adset', id: '20', campaignId: '10', href: campaign + '/adsets/20' }],
    ads: [{ entityType: 'ad', id: '30', campaignId: '10', adsetId: '20', href: campaign + '/adsets/20?adId=30' }],
  };
  assert.equal(getChatEntityHref(snapshot, '10', 'campaign'), campaign);
  assert.equal(getChatEntityHref(snapshot, '20', 'adset'), campaign + '/adsets/20');
  assert.equal(getChatEntityHref(snapshot, '30', 'ad'), campaign + '/adsets/20?adId=30');
  assert.equal(getChatEntityHref(snapshot, 'missing'), null);
  assert.equal(getChatEntityHref(snapshot, '10', 'ad'), null);
  assert.equal(getChatEntityHref(null, '10'), null);
  snapshot.ads[0].adsetId = '';
  assert.equal(getChatEntityHref(snapshot, '30'), null);
  snapshot.campaigns[0].href = '/accounts/other/campaigns/10';
  assert.equal(getChatEntityHref(snapshot, '10'), null);
});

test('unavailable chat references are neutral text without a link or arrow', () => {
  const { ChatEntityLink } = load('src/components/ai/ChatEntityLink.tsx', {
    'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
  });
  const unavailable = renderToStaticMarkup(React.createElement(ChatEntityLink, { href: null, arrow: true }, 'Example ad'));
  assert.match(unavailable, /meta-chat-unavailable-link/);
  assert.doesNotMatch(unavailable, /<a\b|<svg\b|href=/);
  const available = renderToStaticMarkup(React.createElement(ChatEntityLink, { href: '/accounts/act_1/campaigns/10', arrow: true }, 'Example campaign'));
  assert.match(available, /<a\b/);
  assert.match(available, /<svg\b/);
});

function renderSheet(props = {}) {
  const { ChatAccountSheet } = load('src/components/ai/ChatAccountSheet.tsx', {
    react: React,
    '@/components/ui/Modal': { Modal: ({ children }) => React.createElement('div', null, children) },
  });
  return renderToStaticMarkup(React.createElement(ChatAccountSheet, {
    open: true, accounts: sheetAccounts, selectedId: '', days: 14,
    onClose: () => {}, onApply: () => {}, ...props,
  }));
}

test('account sheet needs an explicit account selection before starting chat', () => {
  const html = renderSheet();
  assert.match(html, /First account/);
  assert.match(html, /Second account/);
  assert.match(html, /Search name or ID/);
  assert.match(html, /disabled=""[^>]*>Start chatting/);
});

test('account sheet preserves the active account and analysis period', () => {
  const html = renderSheet({ selectedId: 'act_2', days: 30 });
  assert.match(html, /aria-pressed="true">30 days/);
  assert.match(html, /Use these settings/);
  assert.doesNotMatch(html, /disabled=""/);
});

test('account-local chat keeps the route scope and cannot confirm a missing account', () => {
  const html = renderSheet({ selectedId: 'act_1', lockedId: 'act_2' });
  assert.doesNotMatch(html, /First account|Search name or ID/);
  assert.match(html, /Second account/);
  assert.doesNotMatch(html, /disabled=""/);
  const unavailable = renderSheet({ lockedId: 'act_missing' });
  assert.match(unavailable, /No accounts available/);
  assert.match(unavailable, /disabled=""[^>]*>Start chatting/);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, dependencies) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => dependencies[name] || require(name) });
  return exports;
}

test('public documents never mount authentication or workspace components', () => {
  let pathname;
  const forbidden = () => { throw new Error('Public page mounted authenticated UI'); };
  const dependencies = { 'next/navigation': { usePathname: () => pathname } };
  for (const [name, module] of Object.entries({
    AuthProvider: '@/contexts/AuthContext', MobileScrollMemory: './MobileScrollMemory',
    AuthNotifier: './AuthNotifier', Header: './Header', NavSpacer: './NavSpacer',
    WorkspaceBar: './WorkspaceBar', BottomNav: './BottomNav',
    FloatingAssistant: '@/components/ai/FloatingAssistant', WorkspaceNavigator: './WorkspaceNavigator',
  })) dependencies[module] = { [name]: forbidden };
  const { ApplicationShell } = load('src/components/layout/ApplicationShell.tsx', dependencies);
  for (pathname of ['/privacy-policy', '/terms-of-service', '/privacy', '/terms', '/data-deletion', '/privacy-policy/']) {
    assert.equal(renderToStaticMarkup(React.createElement(ApplicationShell, null, 'Public document')), 'Public document');
  }
  pathname = '/accounts';
  assert.throws(() => renderToStaticMarkup(React.createElement(ApplicationShell)), /mounted authenticated UI/);
});

test('all legal pages render complete server HTML with working section anchors', () => {
  const dependencies = {
    'next/link': { default: ({ children, ...props }) => React.createElement('a', props, children) },
    '@/components/ui/BrandLogo': { BrandLogo: () => null },
  };
  dependencies['@/components/layout/LegalDocument'] = load('src/components/layout/LegalDocument.tsx', dependencies);
  for (const route of ['privacy-policy', 'terms-of-service', 'data-deletion']) {
    const { default: Page, metadata } = load(`src/app/${route}/page.tsx`, dependencies);
    const html = renderToStaticMarkup(React.createElement(Page));
    assert.match(html, /<h1>/);
    assert.match(html, /mailto:info@newgame.studio/);
    assert.match(metadata.title, /Meta Ads AI/);
    for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${anchor}"`), anchor);
    assert.doesNotMatch(html, /localStorage.*never transmitted/);
  }
});

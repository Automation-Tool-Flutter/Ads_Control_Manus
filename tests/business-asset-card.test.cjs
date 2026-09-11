const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function render(business) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/components/businesses/BusinessAssetCard.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const dependencies = {
    react: React,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'next/link': { default: props => React.createElement('a', props) },
    '@/components/ui/CopyButton': { CopyButton: ({ value }) => React.createElement('button', { 'data-copy': value }, 'Copy') },
    '@/components/ui/StatusBadge': { StatusDot: () => null },
    '@/lib/api/businesses': { parseBusinessDetail: () => ({ adAccounts: [{}, {}, {}], pages: [{}, {}], users: [{}], catalogs: [] }) },
  };
  vm.runInNewContext(source, { exports, require: name => {
    if (!(name in dependencies)) throw new Error(name);
    return dependencies[name];
  } });
  return renderToStaticMarkup(React.createElement(exports.BusinessAssetCard, { business }));
}

test('compact business card has one destination and a separate copy action', () => {
  const html = render({ id: 'biz_1', name: 'Solomon Social Media', verification_status: 'not_verified' });
  assert.equal((html.match(/<a /g) || []).length, 1);
  assert.match(html, /href="\/businesses\/biz_1"/);
  assert.doesNotMatch(html, /<a [\s\S]*?<button[\s\S]*?<\/a>/);
  assert.match(html, /data-copy="biz_1"/);
  assert.match(html, /Not verified/);
  assert.match(html, /<dt>Ad accounts<\/dt><dd>3<\/dd>/);
  assert.match(html, /<dt>Catalogs<\/dt><dd>0<\/dd>/);
  assert.doesNotMatch(html, /Full profile|meta-metric/);
});

test('full names, status and avatar fallbacks remain available', () => {
  const name = 'Lifetime:free:meta:blue:badge:https://az-sellers.com/';
  const html = render({ id: 'biz_2', name, verification_status: 'pending' });
  assert.ok(html.includes(name));
  assert.match(html, /Pending verification/);
  assert.match(html, /business-asset-avatar[^>]*>L<\/span>/);
  const withPicture = render({ id: 'biz_3', name: 'Business', profile_picture_uri: '/example.png', verification_status: 'verified' });
  assert.match(withPicture, /alt=""/);
  assert.match(withPicture, /loading="lazy"/);
});

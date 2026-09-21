const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('navigation renders no loader or click observer on the source page', () => {
  const exports = {};
  const effects = [];
  const source = ts.transpileModule(fs.readFileSync('src/components/layout/NavigationFeedback.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, require(name) {
    if (name === 'react') return { useRef: value => ({ current: value }), useEffect: effect => effects.push(effect) };
    if (name === 'next/navigation') return { usePathname: () => '/accounts' };
    throw new Error('Unexpected dependency: ' + name);
  } });
  assert.equal(exports.NavigationFeedback(), null);
  // No DOM access or global listeners before a destination commits.
  effects.forEach(effect => effect());
});

test('destination route boundary owns the loading screen', () => {
  const boundary = fs.readFileSync('src/app/loading.tsx', 'utf8');
  assert.ok(boundary.includes('PageContainer ready={false}'));
  assert.ok(boundary.includes('<LoadingState'));
  const css = fs.readFileSync('src/app/chat-refinement.css', 'utf8');
  assert.doesNotMatch(css, /navigation-loading|menu-navigation-cover/);
});

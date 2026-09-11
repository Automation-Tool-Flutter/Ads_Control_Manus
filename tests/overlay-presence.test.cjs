const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Isolated hook lifecycle harness: no app, DOM, network or wall-clock waits.
function harness({ reduced = false, mobile = true } = {}) {
  let state, initialized = false, dirty = false, pendingEffect, lastDeps, cleanup, open = false, result;
  const timers = new Map();
  let nextId = 0;
  const react = {
    useState(initial) {
      if (!initialized) { state = initial; initialized = true; }
      return [state, value => { if (state !== value) { state = value; dirty = true; } }];
    },
    useEffect(effect, deps) {
      if (!lastDeps || deps.some((value, i) => value !== lastDeps[i])) { pendingEffect = effect; lastDeps = deps; }
    },
  };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/hooks/useOverlayPresence.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: name => { if (name === 'react') return react; throw new Error(name); }, window: {
    matchMedia: query => ({ matches: query.includes('prefers-reduced-motion') ? reduced : mobile }),
    setTimeout: callback => { timers.set(++nextId, callback); return nextId; },
    clearTimeout: id => timers.delete(id),
  } });
  const render = (value = open) => {
    open = value;
    let passes = 0;
    do {
      dirty = false;
      result = exports.useOverlayPresence(open);
      if (pendingEffect) { cleanup?.(); const effect = pendingEffect; pendingEffect = null; cleanup = effect(); }
      assert.ok(++passes < 10, 'hook must settle');
    } while (dirty);
    return result;
  };
  return { render, timers, finish: () => { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } return render(); }, dispose: () => cleanup?.() };
}

test('closed overlays do not start timers; open overlays render immediately', () => {
  const h = harness();
  assert.equal(h.render(false).present, false);
  assert.equal(h.timers.size, 0);
  assert.equal(h.render(true).present, true);
  assert.equal(h.render(true).closing, false);
  assert.equal(h.timers.size, 0);
});

test('mobile close preserves isolation until exit ends and rapid reopen cancels exit', () => {
  const h = harness();
  h.render(true);
  assert.equal(h.render(false).closing, true);
  assert.equal(h.render(false).present, true);
  assert.equal(h.timers.size, 1);
  assert.equal(h.render(true).closing, false);
  assert.equal(h.timers.size, 0);
  h.render(false);
  assert.equal(h.finish().present, false);
});

test('reduced-motion and desktop close without the animation delay', () => {
  for (const options of [{ reduced: true }, { mobile: false }]) {
    const h = harness(options);
    h.render(true);
    assert.equal(h.render(false).present, false);
    assert.equal(h.timers.size, 0);
  }
});

test('unmount cancels pending exit work', () => {
  const h = harness();
  h.render(true); h.render(false); h.dispose();
  assert.equal(h.timers.size, 0);
});

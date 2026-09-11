const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, { exports, ...globals });
  return exports;
}

test('view choices are scoped, bounded and cleared on session reset', () => {
  const { readViewMemory: read, writeViewMemory: write, clearViewMemory: clear } = load('src/lib/view-memory.ts');
  write('user-a/accounts/search', 'Brand');
  assert.equal(read('user-a/accounts/search', ''), 'Brand');
  assert.equal(read('user-b/accounts/search', ''), '');
  assert.equal(read('user-a/pages/search', ''), '');
  clear();
  assert.equal(read('user-a/accounts/search', ''), '');
  for (let i = 0; i < 101; i++) write(String(i), i);
  assert.equal(read('0', -1), -1);
  assert.equal(read('100', -1), 100);
});

test('viewport events coalesce, skip unchanged writes and preserve pinch zoom', () => {
  const listeners = new Map();
  const frames = new Map();
  const writes = [];
  let id = 0;
  const viewport = {
    scale: 1, height: 700, offsetTop: 0,
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: name => listeners.delete(name),
  };
  const window = { visualViewport: viewport, innerHeight: 800, addEventListener() {}, removeEventListener() {} };
  const element = { style: { setProperty: (...args) => writes.push(args), removeProperty() {} } };
  const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn()); };
  const { observeMobileViewport } = load('src/lib/observe-mobile-viewport.ts', {
    window, requestAnimationFrame: fn => { frames.set(++id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id),
  });
  const stop = observeMobileViewport(element, '--height', '--top');
  assert.equal(writes.length, 2);
  listeners.get('resize')(); listeners.get('scroll')();
  assert.equal(frames.size, 1);
  flush(); assert.equal(writes.length, 2);
  viewport.height = 400;
  listeners.get('resize')(); flush();
  assert.deepEqual(writes.at(-1), ['--height', '400px']);
  viewport.scale = 2; viewport.height = 200;
  listeners.get('resize')(); flush();
  assert.equal(writes.length, 3);
  listeners.get('scroll')(); stop();
  assert.equal(frames.size, 0); assert.equal(listeners.size, 0);
});

test('sheet drag dismisses deliberately, snaps back on cancel and respects busy state', () => {
  let closed = 0;
  const panel = { current: { style: { translate: '', removeProperty() { this.translate = ''; } } } };
  const { SheetHandle } = load('src/components/ui/SheetHandle.tsx', {
    window: { matchMedia: () => ({ matches: true }) },
    cancelAnimationFrame() {}, requestAnimationFrame() { return 1; },
    require: name => name === 'react' ? { useRef: value => ({ current: value }), useEffect() {} } : require(name),
  });
  const target = { setPointerCapture() {}, hasPointerCapture: () => true, releasePointerCapture() {} };
  const event = (y, time = 0) => ({ pointerId: 1, clientY: y, timeStamp: time, currentTarget: target, isPrimary: true, button: 0 });
  const props = SheetHandle({ panel, onClose: () => closed++ }).props;
  props.onPointerDown(event(0)); props.onPointerMove(event(90)); props.onPointerUp(event(90, 400));
  props.onClick({ detail: 1 }); assert.equal(closed, 1); // No double close from the synthetic click.
  props.onPointerDown(event(0)); props.onPointerMove(event(20)); props.onPointerUp(event(20, 400));
  props.onClick({ detail: 1 }); assert.equal(closed, 1);
  props.onPointerDown(event(0)); props.onPointerMove(event(100)); props.onPointerCancel(event(100, 400));
  assert.equal(closed, 1);
  props.onClick({ detail: 0 }); assert.equal(closed, 2); // Keyboard activation remains supported.
  const busy = SheetHandle({ panel, onClose: () => closed++, disabled: true }).props;
  busy.onPointerDown(event(0)); busy.onPointerMove(event(100)); busy.onPointerUp(event(100, 400));
  assert.equal(closed, 2); assert.equal(busy.disabled, true);
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function components(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? components(file) : file.endsWith('.tsx') ? [file] : [];
  });
}

test('UI copy does not retain GPT or ChatGPT branding', () => {
  for (const file of components('src')) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /\bGPT\b|Chat\s?GPT/, file);
  }
});

test('surfaces do not use a theme-dependent text color as a background', () => {
  for (const file of components('src')) {
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /\bbg-text-primary\b/, file);
  }
});

function luminance(rgb) {
  return rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
}

test('analysis card labels and action colors meet normal-text contrast in both themes', () => {
  const css = fs.readFileSync('src/app/meta-cards.css', 'utf8');
  const blocks = css.match(/--c-bg-card:[\s\S]*?--c-accent:[^;]+;/g).slice(0, 2);
  const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
  for (const block of blocks) {
    const color = name => block.match(new RegExp(`--c-${name}: ([0-9 ]+);`))[1].split(' ').map(Number);
    for (const text of ['text-primary', 'text-secondary', 'accent']) {
      assert.ok(contrast(color(text), color('bg-secondary')) >= 4.5, text);
    }
  }
  assert.ok(contrast([255, 255, 255], [8, 102, 255]) >= 4.5);
});

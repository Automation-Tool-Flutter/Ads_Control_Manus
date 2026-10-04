const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/lib/report-export.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(code, { exports, Blob, File, TextEncoder, btoa, Error, window: {}, navigator: {}, ...globals });
  return exports;
}

test('CSV picker writes BOM, Vietnamese text, escaped cells and closes the file', async () => {
  let options, blob, closed = false;
  const writer = { async write(value) { blob = value; }, async close() { closed = true; }, async abort() { assert.fail('Should not abort'); } };
  const { downloadCsv } = load({ window: { async showSaveFilePicker(value) { options = value; return { async createWritable() { return writer; } }; } } });
  await downloadCsv('report.csv', [['Tên', 'Value'], ['Đức,"A"', '=1+1']]);
  assert.equal(options.suggestedName, 'report.csv');
  assert.equal(closed, true);
  const buffer = Buffer.from(await blob.arrayBuffer());
  assert.equal(buffer.subarray(0, 3).toString('hex'), 'efbbbf');
  assert.equal(buffer.toString('utf8'), '\uFEFF"Tên","Value"\r\n"Đức,""A""","\'=1+1"');
});

test('WebView sends file bytes, not a blob URL, and requires native acknowledgement', async () => {
  const calls = [];
  const { downloadCsv } = load({ window: { flutter_inappwebview: { async callHandler(...args) { calls.push(args); return { success: true }; } } } });
  await downloadCsv('../report.csv', [['Tên'], ['Tiếng Việt']]);
  assert.equal(calls[0][0], 'downloadFile');
  assert.equal(calls[0][1].filename, '.._report.csv');
  assert.equal(calls[0][1].mimeType, 'text/csv');
  assert.equal(calls[0][1].encoding, 'base64');
  assert.equal(Buffer.from(calls[0][1].data, 'base64').toString('utf8'), '\uFEFF"Tên"\r\n"Tiếng Việt"');
  const missing = load({ window: { flutter_inappwebview: { async callHandler() { return null; } } } });
  await assert.rejects(missing.downloadCsv('report.csv', []), /downloadFile handler/);
});

test('browser fallback triggers download and keeps the blob alive for slow downloads', async () => {
  let clicked = false, removed = false, revoked = false, cleanup;
  const link = { style: {}, click() { clicked = true; }, remove() { removed = true; } };
  const { downloadCsv } = load({
    document: { createElement: () => link, body: { appendChild: value => assert.equal(value, link) } },
    URL: { createObjectURL: () => 'blob:report', revokeObjectURL: () => { revoked = true; } },
    setTimeout(callback, ms) { assert.equal(ms, 60000); cleanup = callback; },
  });
  await downloadCsv('report.csv', [['data']]);
  assert.equal(link.download, 'report.csv');
  assert.ok(clicked && removed); assert.equal(revoked, false);
  cleanup(); assert.equal(revoked, true);
});

test('picker cancellation is quiet and disk failures abort the write and surface errors', async () => {
  const cancelled = load({ window: { async showSaveFilePicker() { const error = new Error('Cancelled'); error.name = 'AbortError'; throw error; } } });
  await cancelled.downloadCsv('report.csv', []);
  let aborted = false;
  const failed = load({ window: { async showSaveFilePicker() { return { async createWritable() {
    return { async write() { throw new Error('Disk full'); }, async close() {}, async abort() { aborted = true; } };
  } }; } } });
  await assert.rejects(failed.downloadCsv('report.csv', []), /Disk full/);
  assert.equal(aborted, true);
});

test('file sharing uses a CSV file and native cancellation is not reported as an error', async () => {
  let shared;
  const { downloadCsv } = load({ navigator: { canShare: () => true, async share(value) { shared = value; } } });
  await downloadCsv('report.csv', [['data']]);
  assert.equal(shared.files[0].name, 'report.csv');
  assert.equal(shared.files[0].type, 'text/csv');
  const cancelled = load({ window: { flutter_inappwebview: { async callHandler() { return { cancelled: true }; } } } });
  await cancelled.downloadCsv('report.csv', []);
});

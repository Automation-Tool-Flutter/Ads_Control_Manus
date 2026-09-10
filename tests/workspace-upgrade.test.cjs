const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
function load(file, globals = {}) {
  const output = ts.transpileModule(fs.readFileSync(path.resolve(file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, URL, Date, ...globals, require: name => {
    if (name === '../constants') return { GRAPH_API_BASE: 'https://graph.example.test', FB_AUTH_ERROR_CODES: [], FB_RATE_LIMIT_CODES: [], FB_TRANSIENT_ERROR_CODES: [] };
    throw new Error('Unexpected dependency: ' + name);
  } });
  return exports;
}
const response = data => ({ ok: true, status: 200, json: async () => data });
test('pagination loads all pages using the original endpoint', async () => {
  const urls = [];
  const { graphFetchAll } = load('src/lib/api/client.ts', { fetch: async url => {
    urls.push(new URL(url));
    return response(urls.length === 1 ? { data: [{id:'1'}], paging: { next:'https://untrusted.test', cursors:{after:'cursor'} } } : {data:[{id:'2'}]});
  } });
  const rows = await graphFetchAll('/act_1/campaigns', {}, 'test', {cache:false});
  assert.equal(rows.length, 2);
  assert.equal(urls[1].hostname, 'graph.example.test');
  assert.equal(urls[1].searchParams.get('after'), 'cursor');
});
test('incomplete pagination fails instead of silently returning partial data', async () => {
  const { graphFetchAll } = load('src/lib/api/client.ts', { fetch: async () => response({ data:[], paging:{next:'next'} }) });
  await assert.rejects(graphFetchAll('/broken', {}, 'test', {cache:false}), /incomplete pagination/);
});
test('expired and legacy cache entries are refreshed', async () => {
  const memory = new Map(); let calls = 0;
  const {graphFetch, CACHE_TTL_MS} = load('src/lib/api/client.ts', {localStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},fetch:async()=>{calls++; return response({data:[calls]});}});
  await graphFetch('/cache',{},'test'); await graphFetch('/cache',{},'test'); assert.equal(calls,1);
  const key = [...memory.keys()][0];
  memory.set(key,JSON.stringify({data:[],cachedAt:Date.now()-CACHE_TTL_MS-1000}));
  await graphFetch('/cache',{},'test'); assert.equal(calls,2);
  memory.set(key,JSON.stringify({data:[]}));
  await graphFetch('/cache',{},'test'); assert.equal(calls,3);
});
test('a failed request can be retried', async () => {
  let calls=0;
  const {graphFetch} = load('src/lib/api/client.ts',{fetch:async()=>{if(++calls===1) throw new Error('offline'); return response({data:[]});}});
  await assert.rejects(graphFetch('/retry',{},'test',{cache:false}),/offline/);
  await graphFetch('/retry',{},'test',{cache:false}); assert.equal(calls,2);
});
test('CSV escapes quotes, separators and spreadsheet formulas', () => {
  const {toCsv} = load('src/lib/report-export.ts');
  assert.equal(toCsv([['Name','Value'],['A,"B"','=1+1']]), '\uFEFF"Name","Value"\r\n"A,""B""","\'=1+1"');
});
test('application-owned literals and AI instructions remain English', () => {
  const {scan} = require('../scripts/audit-language.cjs');
  assert.deepEqual(scan(),[]);
  assert.deepEqual(scan('src/app/api'),[]);
  for(const route of ['post-suggestion','campaign-builder']) assert.doesNotMatch(fs.readFileSync(`src/app/api/${route}/route.ts`,'utf8'), /Write in Vietnamese|Return concise Vietnamese/);
});

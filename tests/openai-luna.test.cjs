const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

// Isolated environment and mocked fetch: never reads credentials or makes API calls.
function client({ env = {}, payload, status = 200, fetchError, bodyError } = {}) {
  const calls = [], logs = [];
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.resolve('src/lib/openai.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, Error, SyntaxError, AbortSignal,
    process: { env: { OPENAI_API_KEY: 'test-only-credential', ...env } },
    console: { error: (...args) => logs.push(args) },
    fetch: async (url, options) => {
      calls.push({ url, body: JSON.parse(options.body) });
      if (fetchError) throw fetchError;
      return { ok: status >= 200 && status < 300, status,
        headers: { get: () => 'req_luna_test' },
        json: async () => { if (bodyError) throw bodyError; return payload ?? completed('{"answer":"ok"}'); },
      };
    },
  });
  return { ...exports, calls, logs };
}
const completed = text => ({ status: 'completed', output: [
  { type: 'reasoning', summary: [] },
  { type: 'message', content: [{ type: 'output_text', text }] },
] });

test('Luna default preserves JSON contract without legacy sampling parameters', async () => {
  const api = client();
  const result = await api.callOpenAI('Return JSON.', 'Analyze data.');
  assert.equal(result.answer, 'ok');
  const { url, body } = api.calls[0];
  assert.equal(url, 'https://api.openai.com/v1/responses');
  assert.equal(body.model, 'gpt-5.6-luna');
  assert.equal(body.reasoning.effort, 'none');
  assert.equal(body.max_output_tokens, 3072);
  assert.equal(body.text.format.type, 'json_object');
  assert.equal(body.store, false);
  for (const field of ['temperature', 'top_p', 'logprobs']) assert.equal(field in body, false);
  assert.match(body.input[0].content, /in English/);
});

test('schemas and image inputs are preserved', async () => {
  const api = client();
  const schema = { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'], additionalProperties: false };
  await api.callOpenAI('Return JSON.', 'Analyze image.', {
    schema: { name: 'test_analysis', value: schema }, imageUrls: ['https://example.test/image.png'], maxOutputTokens: 5500,
  });
  assert.deepEqual(api.calls[0].body.text.format, { type: 'json_schema', name: 'test_analysis', strict: true, schema });
  assert.equal(api.calls[0].body.input[1].content[1].type, 'input_image');
  assert.equal(api.calls[0].body.max_output_tokens, 5500);
});

test('explicit reasoning reserves bounded tokens, with per-call override', async () => {
  const api = client({ env: { OPENAI_REASONING_EFFORT: 'low' } });
  await api.callOpenAI('JSON', 'data', { maxOutputTokens: 5500 });
  assert.equal(api.calls[0].body.reasoning.effort, 'low');
  assert.equal(api.calls[0].body.max_output_tokens, 9596);
  await api.callOpenAI('JSON', 'data', { reasoningEffort: 'none' });
  assert.equal(api.calls[1].body.reasoning.effort, 'none');
  await api.callOpenAI('JSON', 'data', { maxOutputTokens: 128000 });
  assert.equal(api.calls[2].body.max_output_tokens, 128000);
});

test('invalid settings fail before fetch, without switching model', async () => {
  for (const env of [
    { OPENAI_MODEL: 'gpt-4.1-mini' }, { OPENAI_MODEL: 'gpt-5-6-luna' },
    { OPENAI_REASONING_EFFORT: 'invalid' }, { OPENAI_API_KEY: ' ' },
  ]) {
    const api = client({ env });
    await assert.rejects(api.callOpenAI('JSON', 'data'), error => error.status === 500);
    assert.equal(api.calls.length, 0);
  }
});

test('model whitespace is normalized', async () => {
  const api = client({ env: { OPENAI_MODEL: ' gpt-5.6-luna ' } });
  await api.callOpenAI('JSON', 'data');
  assert.equal(api.calls[0].body.model, 'gpt-5.6-luna');
});

test('incomplete output is rejected even if partial JSON happens to parse', async () => {
  const api = client({ payload: { ...completed('{}'), status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } } });
  await assert.rejects(api.callOpenAI('JSON', 'data'), error => error.details.code === 'output_limit');
  assert.equal(api.calls.length, 1);
});

test('refusals and unfinished responses are not treated as valid analyses', async () => {
  const refusal = client({ payload: { status: 'completed', output: [{ content: [{ type: 'refusal', refusal: 'No.' }] }] } });
  await assert.rejects(refusal.callOpenAI('JSON', 'data'), error => error.status === 422 && error.details.code === 'model_refusal');
  const pending = client({ payload: { ...completed('{}'), status: 'in_progress' } });
  await assert.rejects(pending.callOpenAI('JSON', 'data'), error => error.details.code === 'unfinished_response');
});

test('empty, malformed and non-object JSON are rejected', async () => {
  for (const [text, code] of [['', 'empty_output'], ['{', 'invalid_json'], ['null', 'invalid_output'], ['[]', 'invalid_output']]) {
    const api = client({ payload: completed(text) });
    await assert.rejects(api.callOpenAI('JSON', 'data'), error => error.details.code === code);
  }
});

test('provider errors keep useful metadata, never raw messages or credentials', async () => {
  const api = client({ status: 400, payload: { error: {
    code: 'unsupported_parameter', param: 'temperature', message: 'private prompt test-only-credential',
  } } });
  await assert.rejects(api.callOpenAI('private prompt', 'data'), error => {
    assert.match(error.message, /temperature/);
    assert.match(error.message, /req_luna_test/);
    assert.doesNotMatch(error.message, /private prompt|test-only-credential/);
    return error.details.code === 'unsupported_parameter';
  });
  assert.doesNotMatch(JSON.stringify(api.logs), /private prompt|test-only-credential/);
  assert.equal(api.calls.length, 1);
});

test('model access, schema and quota failures are distinguished', async () => {
  for (const [status, code, message] of [
    [404, 'model_not_found', /cannot access gpt-5.6-luna/],
    [400, 'invalid_json_schema', /schema was rejected/],
    [429, 'insufficient_quota', /no available API quota/],
    [401, 'invalid_api_key', /could not authenticate/],
  ]) {
    const api = client({ status, payload: { error: { code } } });
    await assert.rejects(api.callOpenAI('JSON', 'data'), message);
    assert.equal(api.calls.length, 1);
  }
});

test('body-read timeouts are handled, not swallowed as empty content', async () => {
  const error = new Error('timeout'); error.name = 'TimeoutError';
  const api = client({ bodyError: error });
  await assert.rejects(api.callOpenAI('JSON', 'data'), /timed out/);
});

test('all AI routes use the shared client and omit temperature', () => {
  const routes = fs.readdirSync('src/app/api', { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join('src/app/api', entry.name, 'route.ts'))
    .filter(file => fs.existsSync(file))
    .map(file => fs.readFileSync(file, 'utf8'))
    .filter(source => source.includes('callOpenAI'));
  assert.equal(routes.length, 15);
  for (const source of routes) assert.doesNotMatch(source, /temperature\s*:/);
});

// Tests the public Function with a fake Worker. Run from the repo root: node --no-warnings tests/function.test.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const src = readFileSync(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8');
const { onRequest } = await import('data:text/javascript,' + encodeURIComponent(src));

const calls = [];
const env = {
  BQ_WORKER: {
    fetch: async (url, init) => {
      calls.push({ url, ...init });
      return new Response(JSON.stringify({ ok: true, from: 'worker' }), { status: 201 });
    },
  },
};
const call = (path, { method = 'POST', origin = 'https://site.test', body = '{"a":1}', headers = {}, e = env } = {}) => {
  const h = { ...headers };
  if (origin) h.origin = origin;
  const req = new Request('https://site.test/api/' + path, { method, body: method === 'GET' ? undefined : body, headers: h });
  const params = { path: path.split('?')[0].split('/') };
  return onRequest({ request: req, env: e, params });
};

// A normal post goes to the Worker with the visitor address and the Worker's reply comes back
{
  const r = await call('question', { headers: { 'cf-connecting-ip': '203.0.113.9' } });
  assert.equal(r.status, 201);
  assert.deepEqual(await r.json(), { ok: true, from: 'worker' });
  const c = calls.at(-1);
  assert.equal(c.url, 'https://worker/question');
  assert.equal(c.method, 'POST');
  assert.equal(c.body, '{"a":1}');
  assert.equal(c.headers['x-client-ip'], '203.0.113.9');
}

// The list is a GET and the query string goes through
{
  const r = await call('responses?slug=abc', { method: 'GET', origin: null });
  assert.equal(r.status, 201);
  const c = calls.at(-1);
  assert.equal(c.url, 'https://worker/responses?slug=abc');
  assert.equal(c.method, 'GET');
  assert.equal(c.body, undefined);
}

const before = calls.length;
// Only the three routes exist, with their own methods and no extra path
assert.equal((await call('admin')).status, 404);
assert.equal((await call('responses/extra', { method: 'GET', origin: null })).status, 404);
assert.equal((await call('question', { method: 'GET', origin: null })).status, 405);
assert.equal((await call('responses', { method: 'POST' })).status, 405);
// Posts from another site or with no origin are refused
assert.equal((await call('question', { origin: 'https://evil.test' })).status, 403);
assert.equal((await call('response', { origin: null })).status, 403);
// Oversized bodies are refused whether or not the length header is honest
assert.equal((await call('question', { body: 'x'.repeat(10001) })).status, 413);
assert.equal((await call('question', { body: '{}', headers: { 'content-length': '10001' } })).status, 413);
// No Worker bound (for example a preview build) gives a plain 503
assert.equal((await call('question', { e: {} })).status, 503);
// None of those reached the Worker
assert.equal(calls.length, before);

console.log('function ok');

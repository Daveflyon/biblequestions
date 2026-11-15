// Public side of the submission system. It only forwards to the private Worker (no database here).
const ROUTES = { question: 'POST', response: 'POST', responses: 'GET' };
const MAX_BODY = 10000;

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const parts = [].concat(params.path || []);
  const method = parts.length === 1 ? ROUTES[parts[0]] : undefined;
  if (!method) return json({ ok: false, error: 'not_found' }, 404);
  if (request.method !== method) return json({ ok: false, error: 'method' }, 405);
  if (!env.BQ_WORKER) return json({ ok: false, error: 'unavailable' }, 503);

  let body;
  if (method === 'POST') {
    // Extra safeguard against forged posts from other sites. Turnstile is the real check.
    if (request.headers.get('origin') !== url.origin) return json({ ok: false, error: 'origin' }, 403);
    if (Number(request.headers.get('content-length') || 0) > MAX_BODY) return json({ ok: false, error: 'too_large' }, 413);
    body = await request.text();
    if (body.length > MAX_BODY) return json({ ok: false, error: 'too_large' }, 413);
  }

  const res = await env.BQ_WORKER.fetch('https://worker/' + parts[0] + (method === 'GET' ? url.search : ''), {
    method,
    body,
    headers: {
      'content-type': 'application/json',
      'x-client-ip': request.headers.get('cf-connecting-ip') || '',
    },
  });
  return new Response(res.body, {
    status: res.status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

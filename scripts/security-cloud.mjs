// Bounded, anonymous checks. No passwords, privileged keys or load generation.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const c = JSON.parse(await readFile('public/config.json', 'utf8'));
const origin = new URL(c.publicBaseUrl || 'https://1real-sys.github.io').origin;
const id = '00000000-0000-4000-8000-000000000000';
let count = 0;
async function denied(url, init, codes = [401, 403]) {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  await r.arrayBuffer();
  assert.ok(codes.includes(r.status), `Unexpected HTTP ${r.status} on ${new URL(url).pathname}`);
  count++;
}
for (const [path, method, body] of [
  ['/admin/spaces', 'GET'],
  ['/admin/spaces/diorama-mata-atlantica-2', 'GET'],
  ['/admin/spaces/diorama-mata-atlantica-2/draft', 'PUT', {}],
  ['/admin/spaces/diorama-mata-atlantica-2/publish', 'POST', {}],
  ['/admin/spaces/diorama-mata-atlantica-2/restore', 'POST', {}],
  ['/admin/spaces/diorama-mata-atlantica-2/unpublish-section', 'POST', {}],
  [
    '/admin/uploads/authorize',
    'POST',
    { slug: 'diorama-mata-atlantica-2', kind: 'image', mime: 'image/png', size: 8 },
  ],
  ['/admin/uploads/complete', 'POST', { id }],
]) {
  await denied(c.apiBaseUrl + path, {
    method,
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
for (const auth of ['Bearer forged', 'Basic forged', 'Bearer ' + 'a'.repeat(72)]) {
  await denied(c.apiBaseUrl + '/admin/spaces', {
    headers: { Origin: origin, Authorization: auth },
  });
}
for (const originValue of [undefined, 'null', 'https://untrusted.example']) {
  await denied(
    c.apiBaseUrl + '/admin/session',
    { method: 'OPTIONS', headers: originValue ? { Origin: originValue } : {} },
    [403],
  );
}
const headers = { apikey: c.supabasePublishableKey, 'Content-Type': 'application/json' };
for (const table of ['space_drafts', 'space_revisions', 'space_media', 'publish_events']) {
  await denied(`${c.supabaseUrl}/rest/v1/${table}?select=*&limit=1`, { headers });
}
for (const table of ['spaces', 'space_published', 'space_drafts', 'space_media']) {
  const column = ['spaces', 'space_media'].includes(table) ? 'id' : 'space_id';
  const url = `${c.supabaseUrl}/rest/v1/${table}?${column}=eq.${id}`;
  // A nonexistent ID avoids changing real content even if a permission regresses.
  const patch =
    table === 'spaces'
      ? { title: 'security-probe' }
      : table === 'space_published'
        ? { revision: 0 }
        : table === 'space_drafts'
          ? { content: {} }
          : { metadata: {} };
  await denied(url, { method: 'PATCH', headers, body: JSON.stringify(patch) });
  await denied(url, { method: 'DELETE', headers });
}
for (const slug of ['aquario-marinho', 'diorama-mata-atlantica-2']) {
  const r = await fetch(c.apiBaseUrl + '/public/spaces/' + slug, {
    headers: { Origin: origin },
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  const data = await r.json();
  if (data)
    assert.deepEqual(Object.keys(data).sort(), [
      'content',
      'published_at',
      'revision',
      'updated_at',
    ]);
  count++;
}
console.log(
  `Cloud security: ${count} bounded checks passed (anonymous access, forged credentials, CORS, private tables, direct writes and public response fields).`,
);

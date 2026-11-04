// Read-only/negative checks against configured cloud services. No privileged key required.
import assert from 'node:assert/strict';
const api = process.env.API_BASE_URL,
  sb = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_PUBLISHABLE_KEY,
  origin = process.env.PUBLIC_ORIGIN;
if (!api || !sb || !key || !origin)
  throw Error('Set API_BASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and PUBLIC_ORIGIN.');
const headers = { apikey: key, 'Content-Type': 'application/json' };
async function denied(url, init) {
  const r = await fetch(url, init);
  assert.ok([401, 403].includes(r.status), 'Expected access denied, got ' + r.status);
}
await denied(api + '/admin/spaces', { headers: { Origin: origin } });
await denied(api + '/admin/spaces/aquario-marinho/publish', {
  method: 'POST',
  headers: { Origin: origin, 'Content-Type': 'application/json' },
  body: '{"revision":0}',
});
await denied(sb + '/rest/v1/space_drafts?select=*', { headers });
await denied(sb + '/rest/v1/space_revisions?select=*', { headers });
await denied(sb + '/rest/v1/spaces', {
  method: 'POST',
  headers,
  body: JSON.stringify({ slug: 'unauthorized-probe', title: 'probe', position: 99 }),
});
await denied(sb + '/rest/v1/rpc/save_space_draft', {
  method: 'POST',
  headers,
  body: JSON.stringify({ p_space: crypto.randomUUID(), p_content: {}, p_expected: 0 }),
});
await denied(sb + '/storage/v1/object/csb-staging-media/unauthorized-probe.png', {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'image/png' },
  body: new Uint8Array([137, 80, 78, 71]),
});
const publicRead = await fetch(api + '/public/spaces/aquario-marinho', {
  headers: { Origin: origin },
});
assert.equal(publicRead.status, 200);
assert.equal(publicRead.headers.get('cache-control'), 'no-store');
console.log('Cloud smoke: private data and mutations denied; public snapshot available.');

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
const password = randomUUID() + randomUUID();
const key = randomUUID() + randomUUID();
// A small local budget avoids crossing the 60s window on slower machines.
// Production keeps its configured budget of 6000 requests/minute.
const smokeDir = await mkdtemp(join(tmpdir(), 'csb-smoke-config-'));
const smokeConfig = join(smokeDir, 'wrangler.toml');
const config = (await readFile('worker/wrangler.toml', 'utf8'))
  .replace('main = "src/index.ts"', 'main = ' + JSON.stringify(resolve('worker/src/index.ts')))
  .replace('simple = { limit = 6000, period = 60 }', 'simple = { limit = 20, period = 60 }');
assert.ok(config.includes('simple = { limit = 20, period = 60 }'), 'Local budget override failed');
await writeFile(smokeConfig, config);
const child = spawn(
  process.execPath,
  [
    'node_modules/wrangler/bin/wrangler.js',
    'dev',
    '--config',
    smokeConfig,
    '--port',
    '8789',
    '--persist-to',
    '/tmp/csb-worker-' + randomUUID(),
    '--var',
    'ADMIN_PASSWORD:' + password,
    '--var',
    'SESSION_SIGNING_KEY:' + key,
    '--var',
    'SUPABASE_URL:https://example.supabase.co',
    '--var',
    'SUPABASE_SERVICE_ROLE_KEY:local-test-only',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } },
);
let output = '';
for (const stream of [child.stdout, child.stderr])
  stream.on('data', (c) => {
    output = (output + c).slice(-4000);
  });
const api = 'http://localhost:8789';
const headers = {
  Origin: 'http://localhost:4200',
  'Content-Type': 'application/json',
  'CF-Connecting-IP': '192.0.2.20',
};
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(api + '/health')).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.ok(ready, 'Worker failed to start: ' + output);
  assert.equal((await fetch(api + '/admin/spaces', { headers })).status, 401);
  const login = await fetch(api + '/admin/session', {
    method: 'POST',
    headers,
    body: JSON.stringify({ password }),
  });
  assert.equal(login.status, 200);
  const { token } = await login.json();
  const auth = { ...headers, Authorization: 'Bearer ' + token };
  assert.equal((await fetch(api + '/admin/session', { headers: auth })).status, 200);
  assert.equal(
    (await fetch(api + '/admin/session', { method: 'DELETE', headers: auth })).status,
    200,
  );
  assert.equal((await fetch(api + '/admin/session', { headers: auth })).status, 401);
  for (let i = 0; i < 5; i++)
    await fetch(api + '/admin/session', {
      method: 'POST',
      headers,
      body: JSON.stringify({ password: 'invalid' }),
    });
  const blocked = await fetch(api + '/admin/session', {
    method: 'POST',
    headers,
    body: JSON.stringify({ password }),
  });
  assert.equal(blocked.status, 429);
  assert.equal(
    (
      await fetch(api + '/admin/session', {
        method: 'OPTIONS',
        headers: { Origin: 'https://untrusted.example' },
      })
    ).status,
    403,
  );
  // Local runtime only: exercise the native limiter without querying a database.
  let throttled = false;
  for (let i = 0; i < 40; i++) {
    const probe = await fetch(api + '/public/rate-probe', { headers });
    await probe.arrayBuffer();
    if (probe.status === 429) {
      assert.equal(probe.headers.get('Retry-After'), '60');
      throttled = true;
      break;
    }
    assert.equal(probe.status, 404);
  }
  assert.ok(throttled, 'Native public limiter did not reject excess local requests');
  assert.equal((await fetch(api + '/health')).status, 200);
  console.log(
    'Worker runtime local + Durable Object: login, authentication, logout, revocation, persistent limits, native public limiter and CORS passed. No cloud database accessed.',
  );
} finally {
  child.kill('SIGINT');
  await rm(smokeDir, { recursive: true, force: true });
}

import { writeFile } from 'node:fs/promises';
const config = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8787',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
};
for (const k of ['apiBaseUrl', 'supabaseUrl', 'publicBaseUrl']) {
  const v = config[k];
  if (!v) continue;
  const u = new URL(v);
  if (
    u.protocol !== 'https:' &&
    !(u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname))
  )
    throw Error('HTTPS required for ' + k);
  if (u.username || u.password || u.hash || u.search)
    throw Error('Use a base URL without credentials, query or fragment: ' + k);
}
if (config.supabasePublishableKey) {
  let valid = config.supabasePublishableKey.startsWith('sb_publishable_');
  try {
    valid ||=
      JSON.parse(Buffer.from(config.supabasePublishableKey.split('.')[1], 'base64url').toString())
        .role === 'anon';
  } catch {}
  if (!valid) throw Error('Only a publishable/anon key may be included in the SPA.');
}
if (
  process.env.REQUIRE_PRODUCTION_CONFIG === 'true' &&
  (!config.publicBaseUrl || !process.env.API_BASE_URL)
)
  throw Error('Configure PUBLIC_BASE_URL and API_BASE_URL before a Pages release.');
await writeFile('public/config.json', JSON.stringify(config, null, 2) + '\n');

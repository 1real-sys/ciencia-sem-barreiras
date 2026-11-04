// LOCAL TEST DOUBLE ONLY. Production uses worker/src/index.ts and Supabase.
import http from 'node:http';
import { randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 16)
  throw Error(
    'Set DEMO_PASSWORD with at least 16 characters. This is a localhost mock, never deploy it.',
  );
const dir = process.env.DEMO_DIR || '/tmp/csb-v4-demo';
await mkdir(dir, { recursive: true });
let state = { spaces: {}, uploads: {} };
try {
  state = JSON.parse(await readFile(dir + '/state.json', 'utf8'));
} catch {}
const save = () => writeFile(dir + '/state.json', JSON.stringify(state));
const sessions = new Map();
const attempts = new Map();
const empty = () => ({ blocks: [], textEnabled: true, media: [] });
const slugs = [
  'aquario-nascente-rio',
  'aquario-fundo-rio',
  'aquario-lagoa',
  'aquario-marinho',
  'aquario-praia',
  'diorama-manguezal',
  'diorama-restinga',
  'diorama-mata-atlantica',
  'diorama-mata-atlantica-2',
];
const port = Number(process.env.DEMO_PORT || 8787);
const apiOrigin = 'http://localhost:' + port;
const allowedOrigins = (
  process.env.DEMO_ALLOWED_ORIGINS ||
  'http://localhost:4200,http://localhost:4173,http://localhost:4174'
).split(',');
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  res.setHeader('Cache-Control', 'no-store');
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  }
  const send = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  try {
    const u = new URL(req.url, apiOrigin);
    const p = u.pathname;
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (p === '/health') return send(200, { mock: true });
    if (p.startsWith('/files/')) {
      const id = p.split('/')[2];
      const upload = state.uploads[id];
      if (!upload) return send(404, {});
      if (req.method === 'PUT') {
        if (u.searchParams.get('ticket') !== upload.ticket) return send(403, {});
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const bytes = Buffer.concat(chunks);
        if (bytes.length > 50 * 1024 * 1024) return send(413, {});
        await writeFile(dir + '/' + id, bytes);
        upload.validated = true;
        await save();
        return send(200, {});
      }
      if (
        !upload.published &&
        !sessions.has(req.headers.authorization?.replace('Bearer ', '')) &&
        u.searchParams.get('ticket') !== upload.ticket
      )
        return send(403, {});
      res.writeHead(200, { 'Content-Type': upload.mime });
      res.end(await readFile(dir + '/' + id));
      return;
    }
    let raw = '';
    for await (const c of req) {
      raw += c;
      if (raw.length > 300000) return send(413, {});
    }
    const b = raw ? JSON.parse(raw) : {};
    if (p.startsWith('/public/spaces/'))
      return send(200, state.spaces[p.split('/')[3]]?.published || null);
    if (!allowedOrigins.includes(origin)) return send(403, { error: 'Origem não permitida.' });
    if (p === '/admin/session' && req.method === 'POST') {
      const key = req.socket.remoteAddress;
      const attempt = attempts.get(key) || { n: 0, until: Date.now() + 600000 };
      if (attempt.until < Date.now()) {
        attempt.n = 0;
        attempt.until = Date.now() + 600000;
      }
      attempt.n++;
      attempts.set(key, attempt);
      if (attempt.n > 20) return send(429, { error: 'Aguarde antes de tentar novamente.' });
      const digest = (s) =>
        createHash('sha256')
          .update(s || '')
          .digest();
      if (!timingSafeEqual(digest(b.password), digest(password)))
        return send(401, { error: 'Não foi possível entrar. Confira os dados e tente novamente.' });
      const token = randomUUID();
      sessions.set(token, Date.now() + 3600000);
      return send(200, { token });
    }
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!sessions.has(token) || sessions.get(token) < Date.now())
      return send(401, { error: 'Entre novamente para continuar.' });
    if (p === '/admin/session') {
      if (req.method === 'DELETE') sessions.delete(token);
      return send(200, { authenticated: req.method !== 'DELETE' });
    }
    if (p === '/admin/spaces')
      return send(
        200,
        Object.fromEntries(
          slugs.map((s) => [
            s,
            {
              status: state.spaces[s]?.published
                ? 'Publicado'
                : state.spaces[s]
                  ? 'Rascunho'
                  : 'Pendente',
              updated_at: new Date().toISOString(),
            },
          ]),
        ),
      );
    if (p === '/admin/uploads/authorize') {
      if (
        !slugs.includes(b.slug) ||
        b.size > 50 * 1024 * 1024 ||
        ![
          'image/png',
          'image/jpeg',
          'image/webp',
          'audio/mpeg',
          'audio/mp4',
          'audio/ogg',
          'video/mp4',
          'video/webm',
          'text/vtt',
        ].includes(b.mime)
      )
        return send(422, { error: 'Formato não permitido.' });
      const id = randomUUID(),
        ticket = randomUUID();
      state.uploads[id] = { ...b, ticket };
      await save();
      return send(200, {
        id,
        path: id,
        uploadUrl: apiOrigin + '/files/' + id + '?ticket=' + ticket,
      });
    }
    if (p === '/admin/uploads/complete') {
      const upload = state.uploads[b.id];
      if (!upload?.validated) return send(422, { error: 'Arquivo não recebido.' });
      return send(200, {
        id: b.id,
        path: b.id,
        url: apiOrigin + '/files/' + b.id + '?ticket=' + upload.ticket,
      });
    }
    const match = p.match(/^\/admin\/spaces\/([^/]+)(?:\/(draft|publish|restore))?$/);
    if (match && slugs.includes(match[1])) {
      const slug = match[1],
        action = match[2];
      const s = state.spaces[slug] || {
        draft: { content: empty(), revision: 0 },
        published: null,
        history: [],
      };
      if (!action) return send(200, s);
      if (action === 'draft') {
        if (b.revision !== s.draft.revision)
          return send(409, {
            error: 'Este rascunho mudou em outra janela. Reabra o ambiente para revisar.',
          });
        s.draft = { content: b.content, revision: s.draft.revision + 1 };
        state.spaces[slug] = s;
        await save();
        return send(200, s.draft);
      }
      if (action === 'restore') {
        if (b.expectedRevision !== s.draft.revision)
          return send(409, { error: 'O rascunho mudou.' });
        const h = s.history.find((h) => h.revision === b.revision);
        s.draft = { content: structuredClone(h.content), revision: s.draft.revision + 1 };
        await save();
        return send(200, {});
      }
      if (action === 'publish') {
        if (b.revision !== s.draft.revision) return send(409, { error: 'O rascunho mudou.' });
        const c = structuredClone(s.draft.content);
        if (
          c.media.some(
            (m) =>
              m.enabled && (!m.alt.trim() || !m.credit.trim() || (m.kind === 'image' && !m.rights)),
          )
        )
          return send(422, { error: 'Preencha descrição, crédito e direito de uso.' });
        c.media = c.media.filter((m) => m.enabled);
        for (const m of c.media) {
          if (state.uploads[m.id]) state.uploads[m.id].published = true;
        }
        if (!c.textEnabled) c.blocks = [];
        const revision = (s.published?.revision || 0) + 1;
        s.published = {
          content: c,
          revision,
          updated_at: new Date().toISOString(),
          published_at: new Date().toISOString(),
        };
        s.history.unshift(structuredClone(s.published));
        s.draft.revision++;
        await save();
        return send(200, { revision });
      }
    }
    return send(404, { error: 'Endereço não encontrado.' });
  } catch {
    send(500, { error: 'Falha no simulador local.' });
  }
});
server.listen(port, '127.0.0.1', () =>
  console.log('Simulador LOCAL em ' + apiOrigin + '. Dados em ' + dir + '. Não usar em produção.'),
);

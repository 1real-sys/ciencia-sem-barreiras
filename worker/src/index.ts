import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { Content, emptyContent, MAX_FILE, MIME } from '../../shared/content';
import { contentSchema, slugSchema } from '../../shared/schema';
export interface Env {
  ADMIN_PASSWORD: string;
  SESSION_SIGNING_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ALLOWED_ORIGINS: string;
  EXTERNAL_MEDIA_HOSTS: string;
  GUARD: DurableObjectNamespace;
}
export class Guard {
  constructor(private state: DurableObjectState) {}
  async fetch(request: Request) {
    const b = (await request.json()) as {
      op: string;
      key: string;
      value?: unknown;
      limit?: number;
      window?: number;
    };
    const s = this.state.storage;
    if (b.op === 'get') return Response.json((await s.get(b.key)) ?? null);
    if (b.op === 'put') {
      await s.put(b.key, b.value);
      await s.setAlarm(Date.now() + 3600000);
      return Response.json(true);
    }
    if (b.op === 'delete') {
      await s.delete(b.key);
      return Response.json(true);
    }
    const allowed = await s.transaction(async (tx) => {
      const now = Date.now();
      const old = await tx.get<{ n: number; expires: number }>(b.key);
      const r = old && old.expires > now ? old : { n: 0, expires: now + (b.window || 600000) };
      r.n++;
      await tx.put(b.key, r);
      return r.n <= (b.limit || 5);
    });
    await s.setAlarm(Date.now() + 3600000);
    return Response.json(allowed);
  }
  async alarm() {
    const all = await this.state.storage.list<{ expires?: number }>();
    const keys = [...all].filter(([, v]) => v.expires && v.expires < Date.now()).map(([k]) => k);
    if (keys.length) await this.state.storage.delete(keys);
    if (all.size > keys.length) await this.state.storage.setAlarm(Date.now() + 3600000);
  }
}
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}
async function hash(s: string) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
async function equal(a: string, b: string) {
  const x = await hash(a),
    y = await hash(b);
  let n = 0;
  for (let i = 0; i < x.length; i++) n |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return n === 0;
}
async function guard<T>(
  env: Env,
  op: string,
  key: string,
  value?: unknown,
  limit?: number,
): Promise<T> {
  const obj = env.GUARD.get(env.GUARD.idFromName('security'));
  const r = await obj.fetch('https://guard/', {
    method: 'POST',
    body: JSON.stringify({ op, key, value, limit }),
  });
  return r.json() as Promise<T>;
}
function db(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
function optional<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw new Error('database operation failed');
  return r.data;
}
function checked<T>(r: { data: T; error: unknown }): NonNullable<T> {
  if (r.error || r.data === null) throw new Error('database operation failed');
  return r.data as NonNullable<T>;
}
function checkedWrite(r: { error: unknown }): void {
  // PostgREST mutations return data: null unless representation is requested.
  if (r.error) throw new Error('database operation failed');
}
async function body(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    fail(415, 'Formato de envio inválido.');
  const reader = request.body?.getReader();
  if (!reader) fail(422, 'Envie os campos do formulário.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 300000) {
      await reader.cancel();
      fail(413, 'Conteúdo muito grande.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
async function space(client: SupabaseClient, slug: string) {
  slugSchema.parse(slug);
  const row = checked(await client.from('spaces').select('*').eq('slug', slug).single());
  return row as { id: string; slug: string };
}
async function hydrate(client: SupabaseClient, content: Content) {
  const result = structuredClone(content);
  for (const m of result.media) {
    if (m.path) {
      const r = checked(
        await client.storage.from('csb-staging-media').createSignedUrl(m.path, 1800),
      );
      m.url = r.signedUrl;
    }
  }
  for (const m of result.media) {
    if (m.caption) {
      const c = result.media.find(
        (c) => c.kind === 'caption' && (c.id === m.caption || c.url === m.caption),
      );
      if (c) m.caption = c.url;
    }
  }
  for (const m of result.media) {
    if (m.poster) {
      const p = result.media.find(
        (x) => x.kind === 'image' && (x.id === m.poster || x.url === m.poster),
      );
      if (p) m.poster = p.url;
    }
  }
  return result;
}
async function canonical(
  client: SupabaseClient,
  id: string,
  content: Content,
  env: Env,
  publishing = false,
) {
  const c = structuredClone(content);
  for (const m of c.media) {
    if (m.path) {
      const row = checked(
        await client
          .from('space_media')
          .select('*')
          .eq('id', m.id)
          .eq('space_id', id)
          .eq('object_path', m.path)
          .single(),
      );
      if (!row.metadata.validated || row.metadata.kind !== m.kind)
        fail(422, 'Arquivo ainda não validado.');
      m.url = '';
    } else {
      let url: URL;
      try {
        url = new URL(m.url);
      } catch {
        fail(422, 'Informe o endereço HTTPS do vídeo.');
      }
      if (
        !['libras', 'audiodescricao'].includes(m.kind) ||
        url.protocol !== 'https:' ||
        !(env.EXTERNAL_MEDIA_HOSTS || '').split(',').includes(url.hostname) ||
        url.username ||
        url.password
      )
        fail(422, 'Endereço de vídeo não autorizado.');
    }
    if (publishing && m.enabled) {
      if (!m.alt.trim() || !m.credit.trim())
        fail(422, 'Preencha descrição e crédito dos recursos.');
      if (m.kind === 'image' && !m.rights) fail(422, 'Confirme o direito de uso da imagem.');
      if (['audio', 'libras', 'audiodescricao'].includes(m.kind) && !m.transcript.trim())
        fail(422, 'Adicione a transcrição do recurso.');
    }
    if (m.caption) {
      const caption = content.media.find(
        (x) => x.kind === 'caption' && (x.id === m.caption || x.url === m.caption),
      );
      if (!caption) fail(422, 'Selecione uma legenda enviada neste ambiente.');
      m.caption = caption.id;
    }
  }
  for (const m of c.media) {
    if (m.poster) {
      const poster = content.media.find(
        (x) => x.kind === 'image' && (x.id === m.poster || x.url === m.poster),
      );
      if (!poster) fail(422, 'Selecione uma imagem enviada como pôster.');
      m.poster = poster.id;
    }
  }
  return c;
}
async function prefix(response: Response, limit = 4096) {
  if (!response.ok || !response.body) fail(422, 'Não foi possível verificar o arquivo.');
  const reader = response.body.getReader();
  const output = new Uint8Array(limit);
  let n = 0;
  try {
    while (n < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = value.subarray(0, limit - n);
      output.set(chunk, n);
      n += chunk.length;
    }
  } finally {
    await reader.cancel();
  }
  return output.subarray(0, n);
}
export function signature(mime: string, b: Uint8Array) {
  const ascii = new TextDecoder().decode(b);
  if (mime === 'image/png') return [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v);
  if (mime === 'image/jpeg') return b[0] === 255 && b[1] === 216 && b[2] === 255;
  if (mime === 'image/webp') return ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP';
  if (mime === 'video/mp4' || mime === 'audio/mp4') return ascii.slice(4, 8) === 'ftyp';
  if (mime === 'video/webm') return b[0] === 26 && b[1] === 69 && b[2] === 223 && b[3] === 163;
  if (mime === 'audio/ogg') return ascii.startsWith('OggS');
  if (mime === 'audio/mpeg')
    return ascii.startsWith('ID3') || (b[0] === 255 && (b[1] & 224) === 224);
  if (mime === 'text/vtt')
    return (
      ascii.replace(/^\uFEFF/, '').startsWith('WEBVTT') &&
      !/<(?:script|iframe|svg|html)/i.test(ascii)
    );
  return false;
}
async function authenticated(request: Request, env: Env) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) fail(401, 'Entre novamente para continuar.');
  const key = 'session:' + (await hash(token));
  const session = await guard<{ expires: number; fingerprint: string } | null>(env, 'get', key);
  if (
    !session ||
    session.expires < Date.now() ||
    session.fingerprint !== (await hash(env.ADMIN_PASSWORD + env.SESSION_SIGNING_KEY))
  )
    fail(401, 'Entre novamente para continuar.');
  return key;
}
async function handle(request: Request, env: Env) {
  const path = new URL(request.url).pathname;
  const method = request.method;
  if (path === '/health') return Response.json({ ok: true });
  if (
    !env.SUPABASE_URL ||
    !env.SUPABASE_SERVICE_ROLE_KEY ||
    !env.ADMIN_PASSWORD ||
    env.ADMIN_PASSWORD.length < 16 ||
    !env.SESSION_SIGNING_KEY ||
    env.SESSION_SIGNING_KEY.length < 32
  )
    fail(503, 'Serviço indisponível. Procure o responsável pela configuração.');
  const client = db(env);
  const publicMatch = path.match(/^\/public\/spaces\/([^/]+)$/);
  if (publicMatch && method === 'GET') {
    const slug = slugSchema.parse(publicMatch[1]);
    const result = optional(
      await client
        .from('space_published')
        .select('content,revision,updated_at,published_at,spaces!inner(slug)')
        .eq('spaces.slug', slug)
        .not('published_at', 'is', null)
        .maybeSingle(),
    );
    if (!result) return Response.json(null);
    const { content, revision, updated_at, published_at } = result;
    return Response.json({ content, revision, updated_at, published_at });
  }
  if (!path.startsWith('/admin/')) fail(404, 'Endereço não encontrado.');
  if (path === '/admin/session' && method === 'POST') {
    if (
      !(await guard(env, 'rate', 'login:' + request.headers.get('CF-Connecting-IP'), undefined, 5))
    )
      fail(429, 'Não foi possível entrar. Aguarde alguns minutos e tente novamente.');
    const b = z.object({ password: z.string().max(512) }).parse(await body(request));
    if (!(await equal(b.password, env.ADMIN_PASSWORD)))
      fail(401, 'Não foi possível entrar. Confira os dados e tente novamente.');
    const token = crypto.randomUUID() + crypto.randomUUID();
    await guard(env, 'put', 'session:' + (await hash(token)), {
      expires: Date.now() + 3600000,
      fingerprint: await hash(env.ADMIN_PASSWORD + env.SESSION_SIGNING_KEY),
    });
    return Response.json({ token, expiresIn: 3600 });
  }
  const session = await authenticated(request, env);
  if (path === '/admin/session') {
    if (method === 'DELETE') await guard(env, 'delete', session);
    return Response.json({ authenticated: method !== 'DELETE' });
  }
  if (method !== 'GET' && !(await guard(env, 'rate', 'write:' + session, undefined, 100)))
    fail(429, 'Aguarde antes de tentar novamente.');
  if (path === '/admin/spaces' && method === 'GET') {
    const [draftResult, publishedResult, spacesResult] = await Promise.all([
      client.from('space_drafts').select('space_id,updated_at'),
      client.from('space_published').select('space_id,updated_at,published_at'),
      client.from('spaces').select('id,slug'),
    ]);
    const drafts = checked(draftResult);
    const published = checked(publishedResult);
    const spaces = checked(spacesResult);
    return Response.json(
      Object.fromEntries(
        spaces.map((s) => {
          const d = drafts.find((d) => d.space_id === s.id),
            p = published.find((p) => p.space_id === s.id && p.published_at);
          return [
            s.slug,
            {
              status:
                d && (!p || d.updated_at > p.updated_at)
                  ? 'Rascunho'
                  : p
                    ? 'Publicado'
                    : 'Pendente',
              updated_at: d?.updated_at || p?.updated_at || '',
            },
          ];
        }),
      ),
    );
  }
  const sm = path.match(
    /^\/admin\/spaces\/([^/]+)(?:\/(draft|publish|restore|unpublish-section))?$/,
  );
  if (sm) {
    const s = await space(client, sm[1]);
    const action = sm[2];
    if (!action && method === 'GET') {
      const [draftResult, publishedResult, historyResult] = await Promise.all([
        client.from('space_drafts').select('*').eq('space_id', s.id).maybeSingle(),
        client.from('space_published').select('*').eq('space_id', s.id).maybeSingle(),
        client
          .from('space_revisions')
          .select('revision,created_at')
          .eq('space_id', s.id)
          .order('revision', { ascending: false })
          .limit(20),
      ]);
      const d = optional(draftResult);
      const p = optional(publishedResult);
      const h = checked(historyResult);
      return Response.json({
        draft: {
          content: await hydrate(client, d?.content || emptyContent()),
          revision: d?.version || 0,
          updated_at: d?.updated_at,
        },
        published: p,
        history: h,
      });
    }
    if (action === 'draft' && method === 'PUT') {
      const b = z
        .object({ content: contentSchema, revision: z.number().int().nonnegative() })
        .parse(await body(request));
      const content = await canonical(client, s.id, b.content, env);
      const r = await client.rpc('save_space_draft', {
        p_space: s.id,
        p_content: content,
        p_expected: b.revision,
      });
      if (r.error)
        fail(409, 'Este rascunho mudou em outra janela. Reabra o ambiente para revisar.');
      return Response.json({ content, revision: r.data });
    }
    if (action === 'restore' && method === 'POST') {
      const b = z
        .object({ revision: z.number().int(), expectedRevision: z.number().int() })
        .parse(await body(request));
      const old = checked(
        await client
          .from('space_revisions')
          .select('content')
          .eq('space_id', s.id)
          .eq('revision', b.revision)
          .single(),
      );
      const r = await client.rpc('save_space_draft', {
        p_space: s.id,
        p_content: old.content,
        p_expected: b.expectedRevision,
      });
      if (r.error) fail(409, 'O rascunho mudou. Reabra o ambiente.');
      return Response.json({ ok: true });
    }
    if ((action === 'publish' || action === 'unpublish-section') && method === 'POST') {
      const b = z
        .object({
          revision: z.number().int(),
          section: z.enum(['texto', 'image', 'audio', 'libras', 'audiodescricao']).optional(),
        })
        .parse(await body(request));
      const draft = checked(
        await client.from('space_drafts').select('*').eq('space_id', s.id).single(),
      );
      if (draft.version !== b.revision) fail(409, 'O rascunho mudou. Reabra o ambiente.');
      const c = await canonical(client, s.id, contentSchema.parse(draft.content), env, true);
      if (action === 'unpublish-section') {
        if (!b.section) fail(422, 'Escolha a seção.');
        if (b.section === 'texto') c.textEnabled = false;
        else
          c.media.forEach((m) => {
            if (m.kind === b.section) m.enabled = false;
          });
      }
      const pub = structuredClone(c);
      if (!pub.textEnabled) pub.blocks = [];
      pub.media = pub.media.filter((m) => m.enabled);
      for (const m of pub.media) {
        if (m.path) {
          const copied = await client.storage
            .from('csb-staging-media')
            .copy(m.path, m.path, { destinationBucket: 'csb-public-media' });
          if (copied.error) {
            const exists = await client.storage.from('csb-public-media').exists(m.path);
            if (exists.error || !exists.data) throw copied.error;
          }
          m.url = client.storage.from('csb-public-media').getPublicUrl(m.path).data.publicUrl;
        }
      }
      for (const m of pub.media) {
        if (m.caption) {
          const cap = pub.media.find((x) => x.id === m.caption);
          if (!cap) fail(422, 'Habilite a legenda usada pelo vídeo.');
          m.caption = cap.url;
        }
      }
      for (const m of pub.media) {
        if (m.poster) {
          const poster = pub.media.find((x) => x.kind === 'image' && x.id === m.poster);
          if (!poster) fail(422, 'Habilite a imagem de pôster antes de publicar.');
          m.poster = poster.url;
        }
      }
      const r = await client.rpc('publish_space', {
        p_space: s.id,
        p_content: pub,
        p_draft: c,
        p_expected: b.revision,
      });
      if (r.error)
        fail(409, 'Não foi possível publicar esta revisão. Reabra o ambiente e tente novamente.');
      return Response.json({ revision: r.data });
    }
  }
  if (path === '/admin/uploads/authorize' && method === 'POST') {
    const b = z
      .object({
        slug: slugSchema,
        kind: z.enum(['image', 'audio', 'libras', 'audiodescricao', 'caption']),
        mime: z.string(),
        size: z.number().int().positive().max(MAX_FILE),
      })
      .parse(await body(request));
    if (
      !MIME[b.mime] ||
      (b.kind === 'image' && !b.mime.startsWith('image/')) ||
      (b.kind === 'audio' && !b.mime.startsWith('audio/')) ||
      (['libras', 'audiodescricao'].includes(b.kind) && !b.mime.startsWith('video/')) ||
      (b.kind === 'caption' && b.mime !== 'text/vtt')
    )
      fail(422, 'Formato de arquivo não permitido.');
    const s = await space(client, b.slug);
    const id = crypto.randomUUID();
    const objectPath = s.id + '/' + id + '.' + MIME[b.mime];
    const signed = checked(
      await client.storage.from('csb-staging-media').createSignedUploadUrl(objectPath),
    );
    const metadata = {
      kind: b.kind,
      mime: b.mime,
      size: b.size,
      validated: false,
      expires: Date.now() + 600000,
    };
    checkedWrite(
      await client.from('space_media').insert({
        id,
        space_id: s.id,
        kind:
          (
            { libras: 'libras_video', audiodescricao: 'audiodescricao_video' } as Record<
              string,
              string
            >
          )[b.kind] || b.kind,
        stage: 'staging',
        storage_bucket: 'csb-staging-media',
        object_path: objectPath,
        metadata,
      }),
    );
    return Response.json({
      id,
      path: objectPath,
      uploadUrl: signed.signedUrl,
      token: signed.token,
    });
  }
  if (path === '/admin/uploads/complete' && method === 'POST') {
    const b = z.object({ id: z.string().uuid() }).parse(await body(request));
    const m = checked(await client.from('space_media').select('*').eq('id', b.id).single());
    if (m.metadata.expires < Date.now() && !m.metadata.validated)
      fail(410, 'O prazo de confirmação terminou. Selecione o arquivo novamente.');
    const url = checked(
      await client.storage.from('csb-staging-media').createSignedUrl(m.object_path, 60),
    );
    const head = await fetch(url.signedUrl, { method: 'HEAD' });
    if (
      !head.ok ||
      Number(head.headers.get('Content-Length')) !== m.metadata.size ||
      head.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== m.metadata.mime ||
      Number(head.headers.get('Content-Length')) > MAX_FILE
    )
      fail(422, 'O arquivo recebido não corresponde ao envio autorizado.');
    const response = await fetch(url.signedUrl, { headers: { Range: 'bytes=0-4095' } });
    const bytes = await prefix(response);
    if (!signature(m.metadata.mime, bytes)) {
      await client.storage.from('csb-staging-media').remove([m.object_path]);
      fail(422, 'O conteúdo do arquivo não corresponde ao formato permitido.');
    }
    checkedWrite(
      await client
        .from('space_media')
        .update({ metadata: { ...m.metadata, validated: true } })
        .eq('id', b.id),
    );
    const preview = checked(
      await client.storage.from('csb-staging-media').createSignedUrl(m.object_path, 1800),
    );
    return Response.json({ id: m.id, path: m.object_path, url: preview.signedUrl });
  }
  fail(404, 'Endereço não encontrado.');
}
export default {
  async fetch(request: Request, env: Env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').includes(origin);
    const path = new URL(request.url).pathname;
    const cors: Record<string, string> = {
      Vary: 'Origin',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    };
    if (allowed) {
      cors['Access-Control-Allow-Origin'] = origin;
      cors['Access-Control-Allow-Headers'] = 'Content-Type,Authorization';
      cors['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
    }
    try {
      if (path.startsWith('/admin/') && !allowed) fail(403, 'Origem não permitida.');
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
      const r = await handle(request, env);
      for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);
      return r;
    } catch (e) {
      const status =
        e instanceof HttpError
          ? e.status
          : e instanceof z.ZodError || e instanceof SyntaxError
            ? 422
            : 503;
      return Response.json(
        {
          error:
            e instanceof HttpError
              ? e.message
              : status === 422
                ? 'Confira os campos e formatos enviados.'
                : 'Não foi possível concluir. Tente novamente.',
        },
        { status, headers: cors },
      );
    }
  },
  async scheduled(_event: ScheduledEvent, env: Env) {
    const client = db(env);
    const old = checked(
      await client
        .from('space_media')
        .select('*')
        .eq('stage', 'staging')
        .lt('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    );
    const drafts = checked(await client.from('space_drafts').select('content'));
    const revisions = checked(await client.from('space_revisions').select('content'));
    const published = checked(await client.from('space_published').select('content'));
    const references = JSON.stringify([...drafts, ...revisions, ...published]);
    for (const m of old) {
      if (!references.includes(m.id)) {
        checked(await client.storage.from('csb-staging-media').remove([m.object_path]));
        checked(await client.storage.from('csb-public-media').remove([m.object_path]));
        checkedWrite(await client.from('space_media').delete().eq('id', m.id));
      }
    }
  },
};

import { readFile } from 'node:fs/promises';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker, { Guard, signature, Env } from '../../worker/src/index';
import { emptyContent, SPACES } from '../../shared/content';
import { contentSchema } from '../../shared/schema';
const fakeDb = vi.hoisted(() => ({ from: vi.fn(), storage: { from: vi.fn() }, rpc: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => fakeDb }));
function fixture() {
  const storage = new Map<string, unknown>();
  const guard = {
    async fetch(_url: string, init: { body: string }) {
      const b = JSON.parse(init.body);
      if (b.op === 'get') return Response.json(storage.get(b.key) || null);
      if (b.op === 'put') {
        storage.set(b.key, b.value);
        return Response.json(true);
      }
      if (b.op === 'delete') {
        storage.delete(b.key);
        return Response.json(true);
      }
      const n = Number(storage.get(b.key) || 0) + 1;
      storage.set(b.key, n);
      return Response.json(n <= (b.limit || 5));
    },
  };
  const env = {
    ADMIN_PASSWORD: 'test-only-long-password',
    SESSION_SIGNING_KEY: 'test-only-signing-key-at-least-thirty-two',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'server-only-test',
    ALLOWED_ORIGINS: 'https://example.github.io',
    EXTERNAL_MEDIA_HOSTS: '',
    PUBLIC_REQUESTS: { limit: vi.fn(async () => ({ success: true })) },
    ADMIN_REQUESTS: { limit: vi.fn(async () => ({ success: true })) },
    GUARD: { idFromName: () => '', get: () => guard },
  } as unknown as Env;
  return { env, storage };
}
function req(
  path: string,
  method = 'GET',
  body?: unknown,
  token?: string,
  origin = 'https://example.github.io',
) {
  return new Request('https://api.example' + path, {
    method,
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      'CF-Connecting-IP': '192.0.2.1',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
describe('Worker security boundary', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(['/public/spaces/aquario-marinho', '/admin/spaces'])(
    'throttles abuse before accessing database or session storage: %s',
    async (path) => {
      const { env } = fixture();
      const limiter = path.startsWith('/admin') ? env.ADMIN_REQUESTS : env.PUBLIC_REQUESTS;
      vi.mocked(limiter.limit).mockResolvedValue({ success: false });
      const get = vi.spyOn(env.GUARD, 'get');
      const request = req(path);
      request.headers.set('X-Forwarded-For', 'attacker-controlled');
      const response = await worker.fetch(request, env);
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
      expect(limiter.limit).toHaveBeenCalledWith({ key: '192.0.2.1' });
      expect(fakeDb.from).not.toHaveBeenCalled();
      expect(get).not.toHaveBeenCalled();
    },
  );
  it('fails closed when the rate limiting service fails', async () => {
    const { env } = fixture();
    vi.mocked(env.PUBLIC_REQUESTS.limit).mockRejectedValue(new Error('internal details'));
    const response = await worker.fetch(req('/public/spaces/aquario-marinho'), env);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('internal details');
    expect(fakeDb.from).not.toHaveBeenCalled();
  });
  it('rejects malformed credentials before accessing session storage', async () => {
    const { env } = fixture();
    const get = vi.spyOn(env.GUARD, 'get');
    for (const value of ['Basic fake', 'fake', 'Bearer ' + 'x'.repeat(10000), 'Bearer short']) {
      const request = req('/admin/spaces');
      request.headers.set('Authorization', value);
      expect((await worker.fetch(request, env)).status).toBe(401);
    }
    expect(get).not.toHaveBeenCalled();
    expect(fakeDb.from).not.toHaveBeenCalled();
  });
  it('rejects invalid JSON, wrong content types and oversized bodies', async () => {
    for (const [payload, type, status] of [
      ['{', 'application/json', 422],
      ['{}', 'text/plain', 415],
      ['x'.repeat(300001), 'application/json', 413],
    ] as const) {
      const { env } = fixture();
      const r = await worker.fetch(
        new Request('https://api.example/admin/session', {
          method: 'POST',
          headers: { Origin: 'https://example.github.io', 'Content-Type': type },
          body: payload,
        }),
        env,
      );
      expect(r.status).toBe(status);
      expect(await r.text()).not.toMatch(/stack|SUPABASE|service_role|test-only/);
    }
  });
  it.each(['published', 'empty', 'error'])(
    'reads only the public snapshot with one query: %s',
    async (state) => {
      const { env } = fixture();
      const snapshot = {
        content: emptyContent(),
        revision: 2,
        updated_at: '2026-11-04',
        published_at: '2026-11-04',
      };
      const maybeSingle = vi.fn(async () => ({
        data: state === 'published' ? { ...snapshot, spaces: { slug: 'aquario-marinho' } } : null,
        error: state === 'error' ? { message: 'unavailable' } : null,
      }));
      const not = vi.fn(() => ({ maybeSingle }));
      const eq = vi.fn(() => ({ not }));
      fakeDb.from.mockReturnValue({ select: () => ({ eq }) });
      const response = await worker.fetch(req('/public/spaces/aquario-marinho'), env);
      expect(response.status).toBe(state === 'error' ? 503 : 200);
      expect(fakeDb.from).toHaveBeenCalledExactlyOnceWith('space_published');
      expect(eq).toHaveBeenCalledWith('spaces.slug', 'aquario-marinho');
      expect(not).toHaveBeenCalledWith('published_at', 'is', null);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      if (state !== 'error')
        expect(await response.json()).toEqual(state === 'published' ? snapshot : null);
    },
  );
  it.each(
    [false, true].flatMap((error) =>
      ['image', 'text_pdf', 'activity_pdf', 'audiodescricao'].map((kind) => ({ error, kind })),
    ),
  )(
    'handles minimal mutation responses during $kind upload (error: $error)',
    async ({ error: mutationError, kind }) => {
      const { env } = fixture();
      const login = await worker.fetch(
        req('/admin/session', 'POST', { password: env.ADMIN_PASSWORD }),
        env,
      );
      const { token } = await login.json();
      const id = 'ed2f07ae-e9c6-4c71-923c-26422c5ac099';
      const mime =
        kind === 'image'
          ? 'image/png'
          : kind === 'audiodescricao'
            ? 'audio/wav'
            : 'application/pdf';
      const bytes =
        kind === 'image'
          ? new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
          : kind === 'audiodescricao'
            ? await readFile('tests/fixtures/audio/silence.wav')
            : new TextEncoder().encode('%PDF-1.7\n');
      const result = { data: null, error: mutationError ? { message: 'write denied' } : null };
      const insert = vi.fn(async () => result);
      const update = vi.fn(() => ({ eq: async () => result }));
      fakeDb.from.mockImplementation((table) => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data:
                table === 'spaces'
                  ? { id, slug: 'diorama-mata-atlantica-2' }
                  : {
                      id,
                      object_path: 'test.png',
                      metadata: {
                        expires: Date.now() + 60000,
                        size: bytes.length,
                        mime,
                        validated: false,
                      },
                    },
              error: null,
            }),
          }),
        }),
        insert,
        update,
      }));
      fakeDb.storage.from.mockReturnValue({
        createSignedUploadUrl: async () => ({
          data: { signedUrl: 'https://storage.example/upload', token: 'test' },
          error: null,
        }),
        createSignedUrl: async () => ({
          data: { signedUrl: 'https://storage.example/preview' },
          error: null,
        }),
      });
      const auth = await worker.fetch(
        req(
          '/admin/uploads/authorize',
          'POST',
          {
            slug: 'diorama-mata-atlantica-2',
            kind,
            mime,
            size: bytes.length,
          },
          token,
        ),
        env,
      );
      expect(auth.status).toBe(mutationError ? 503 : 200);
      expect(insert).toHaveBeenCalledOnce();
      if (!mutationError)
        expect((await auth.json()).uploadUrl).toBe('https://storage.example/upload');
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url, init) =>
          init.method === 'HEAD'
            ? new Response(null, {
                headers: { 'Content-Length': String(bytes.length), 'Content-Type': mime },
              })
            : new Response(bytes),
        ),
      );
      try {
        const complete = await worker.fetch(
          req('/admin/uploads/complete', 'POST', { id }, token),
          env,
        );
        expect(complete.status).toBe(mutationError ? 503 : 200);
        expect(update).toHaveBeenCalledOnce();
        if (!mutationError)
          expect((await complete.json()).url).toBe('https://storage.example/preview');
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );
  it.each(
    [
      ['m4a', 'audio/mp4', 'mp4'],
      ['wma', 'audio/x-ms-wma', 'wmv'],
    ].flatMap(([ext, mime, video]) =>
      [false, true].map((forged) => ({ ext, mime, video, forged })),
    ),
  )(
    'checks ranged $ext audio metadata during confirmation (video: $forged)',
    async ({ ext, mime, video, forged }) => {
      const { env } = fixture();
      const login = await worker.fetch(
        req('/admin/session', 'POST', { password: env.ADMIN_PASSWORD }),
        env,
      );
      const { token } = await login.json();
      const bytes = await readFile(
        `tests/fixtures/audio/${forged ? 'video.' + video : 'silence.' + ext}`,
      );
      const id = 'ed2f07ae-e9c6-4c71-923c-26422c5ac099';
      const update = vi.fn(() => ({ eq: async () => ({ data: null, error: null }) }));
      fakeDb.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id,
                object_path: 'audio.' + ext,
                metadata: {
                  kind: 'audiodescricao',
                  mime,
                  size: bytes.length,
                  expires: Date.now() + 60000,
                },
              },
              error: null,
            }),
          }),
        }),
        update,
      });
      const remove = vi.fn(async () => ({ data: [], error: null }));
      fakeDb.storage.from.mockReturnValue({
        createSignedUrl: async () => ({
          data: { signedUrl: 'https://storage.example/audio' },
          error: null,
        }),
        remove,
      });
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url, init) => {
          if (init.method === 'HEAD')
            return new Response(null, {
              headers: { 'Content-Type': mime, 'Content-Length': String(bytes.length) },
            });
          const [start, end] = init.headers.Range.match(/\d+/g).map(Number);
          const last = Math.min(end, bytes.length - 1);
          return new Response(bytes.subarray(start, last + 1), {
            status: 206,
            headers: { 'Content-Range': `bytes ${start}-${last}/${bytes.length}` },
          });
        }),
      );
      try {
        const response = await worker.fetch(
          req('/admin/uploads/complete', 'POST', { id }, token),
          env,
        );
        expect(response.status).toBe(forged ? 422 : 200);
        expect(update).toHaveBeenCalledTimes(forged ? 0 : 1);
        expect(remove).toHaveBeenCalledTimes(forged ? 1 : 0);
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );
  it('denies unauthenticated private reads and publication', async () => {
    const { env } = fixture();
    for (const [p, m] of [
      ['/admin/spaces', 'GET'],
      ['/admin/spaces/aquario-marinho/publish', 'POST'],
    ])
      expect((await worker.fetch(req(p, m), env)).status).toBe(401);
    expect(fakeDb.from).not.toHaveBeenCalled();
  });
  it('denies disallowed origins including preflights', async () => {
    const { env } = fixture();
    for (const m of ['POST', 'OPTIONS'])
      expect(
        (await worker.fetch(req('/admin/session', m, {}, undefined, 'https://evil.example'), env))
          .status,
      ).toBe(403);
  });
  it('limits wrong passwords persistently through the guard binding', async () => {
    const { env } = fixture();
    for (let i = 0; i < 5; i++)
      expect(
        (await worker.fetch(req('/admin/session', 'POST', { password: 'incorrect' }), env)).status,
      ).toBe(401);
    expect(
      (await worker.fetch(req('/admin/session', 'POST', { password: env.ADMIN_PASSWORD }), env))
        .status,
    ).toBe(429);
  });
  it('validates session, expires, revokes on logout and invalidates on rotation', async () => {
    const { env, storage } = fixture();
    async function login() {
      const r = await worker.fetch(
        req('/admin/session', 'POST', { password: env.ADMIN_PASSWORD }),
        env,
      );
      expect(r.status).toBe(200);
      return (await r.json()).token as string;
    }
    const token = await login();
    expect((await worker.fetch(req('/admin/session', 'GET', undefined, token), env)).status).toBe(
      200,
    );
    await worker.fetch(req('/admin/session', 'DELETE', undefined, token), env);
    expect((await worker.fetch(req('/admin/session', 'GET', undefined, token), env)).status).toBe(
      401,
    );
    const t2 = await login();
    for (const [k, v] of storage) {
      if (k.startsWith('session:')) storage.set(k, { ...(v as object), expires: 0 });
    }
    expect((await worker.fetch(req('/admin/session', 'GET', undefined, t2), env)).status).toBe(401);
    const t3 = await login();
    env.ADMIN_PASSWORD += 'rotated';
    expect((await worker.fetch(req('/admin/session', 'GET', undefined, t3), env)).status).toBe(401);
  });
  it('rejects invalid types and oversize upload before any storage operation', async () => {
    const { env } = fixture();
    const login = await worker.fetch(
      req('/admin/session', 'POST', { password: env.ADMIN_PASSWORD }),
      env,
    );
    const { token } = await login.json();
    for (const b of [
      { mime: 'image/svg+xml', size: 10 },
      { mime: 'image/png', size: 52428801 },
      { kind: 'text_pdf', mime: 'image/png', size: 10 },
      { kind: 'activity_pdf', mime: 'text/html', size: 10 },
      { kind: 'activity_pdf', mime: 'application/pdf', size: 52428801 },
      { kind: 'image', mime: 'application/pdf', size: 10 },
      { kind: 'audiodescricao', mime: 'video/mp4', size: 10 },
      { kind: 'audiodescricao', mime: 'video/webm', size: 10 },
      { kind: 'caption', mime: 'text/vtt', size: 10 },
    ])
      expect(
        (
          await worker.fetch(
            req(
              '/admin/uploads/authorize',
              'POST',
              { slug: 'aquario-marinho', kind: 'image', ...b },
              token,
            ),
            env,
          )
        ).status,
      ).toBe(422);
    expect(fakeDb.from).not.toHaveBeenCalled();
  });
  it('rejects expired upload confirmations', async () => {
    const { env } = fixture();
    const r = await worker.fetch(
      req('/admin/session', 'POST', { password: env.ADMIN_PASSWORD }),
      env,
    );
    const { token } = await r.json();
    fakeDb.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { metadata: { expires: 0, validated: false } },
            error: null,
          }),
        }),
      }),
    });
    const result = await worker.fetch(
      req('/admin/uploads/complete', 'POST', { id: 'ed2f07ae-e9c6-4c71-923c-26422c5ac099' }, token),
      env,
    );
    expect(result.status).toBe(410);
    expect(fakeDb.storage.from).not.toHaveBeenCalled();
  });
  it.each(['image/png', 'application/pdf'])(
    'refuses executable bytes declared as %s',
    async (mime) => {
      const { env } = fixture();
      const r = await worker.fetch(
        req('/admin/session', 'POST', { password: env.ADMIN_PASSWORD }),
        env,
      );
      const { token } = await r.json();
      const bytes = new TextEncoder().encode('<svg onload=alert(1)>');
      fakeDb.from.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                object_path: 'test.png',
                metadata: {
                  expires: Date.now() + 60000,
                  size: bytes.length,
                  mime,
                  validated: false,
                },
              },
              error: null,
            }),
          }),
        }),
      });
      const remove = vi.fn(async () => ({ data: [], error: null }));
      fakeDb.storage.from.mockReturnValue({
        createSignedUrl: async () => ({
          data: { signedUrl: 'https://storage.example/test' },
          error: null,
        }),
        remove,
      });
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_u, init) =>
          init.method === 'HEAD'
            ? new Response(null, {
                headers: { 'Content-Length': String(bytes.length), 'Content-Type': mime },
              })
            : new Response(bytes),
        ),
      );
      try {
        expect(
          (
            await worker.fetch(
              req(
                '/admin/uploads/complete',
                'POST',
                { id: 'ed2f07ae-e9c6-4c71-923c-26422c5ac099' },
                token,
              ),
              env,
            )
          ).status,
        ).toBe(422);
        expect(remove).toHaveBeenCalledWith(['test.png']);
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );
  it('promotes PDFs, caption and poster before one atomic publication RPC', async () => {
    const { env } = fixture();
    const login = await worker.fetch(
      req('/admin/session', 'POST', { password: env.ADMIN_PASSWORD }),
      env,
    );
    const { token } = await login.json();
    const ids = [
      'ed2f07ae-e9c6-4c71-923c-26422c5ac099',
      'ed2f07ae-e9c6-4c71-923c-26422c5ac098',
      'ed2f07ae-e9c6-4c71-923c-26422c5ac097',
      'ed2f07ae-e9c6-4c71-923c-26422c5ac096',
      'ed2f07ae-e9c6-4c71-923c-26422c5ac095',
      'ed2f07ae-e9c6-4c71-923c-26422c5ac094',
    ];
    const content = contentSchema.parse({
      ...emptyContent(),
      media: [
        {
          id: ids[0],
          kind: 'image',
          path: 'space/image.png',
          rights: true,
          alt: 'Image',
          credit: 'QA',
        },
        { id: ids[1], kind: 'caption', path: 'space/caption.vtt', alt: 'Captions', credit: 'QA' },
        {
          id: ids[2],
          kind: 'libras',
          path: 'space/video.mp4',
          alt: 'Video',
          credit: 'QA',
          transcript: 'Test transcript',
          caption: ids[1],
          poster: ids[0],
        },
        { id: ids[3], kind: 'text_pdf', path: 'space/text.pdf', alt: 'Texto', credit: 'QA' },
        {
          id: ids[4],
          kind: 'activity_pdf',
          path: 'space/activity.pdf',
          alt: 'Atividade',
          credit: 'QA',
        },
        {
          id: ids[5],
          kind: 'audiodescricao',
          mime: 'audio/wav',
          path: 'space/audio.wav',
          alt: 'Audiodescrição de teste',
          credit: 'QA',
          transcript: 'Texto de teste',
          caption: ids[1],
          poster: ids[0],
        },
      ],
    });
    fakeDb.from.mockImplementation((table: string) => {
      const filters: Record<string, string> = {};
      const query = {
        select: () => query,
        eq: (k: string, v: string) => {
          filters[k] = v;
          return query;
        },
        single: async () => ({
          data:
            table === 'spaces'
              ? { id: 'space' }
              : table === 'space_drafts'
                ? { version: 4, content }
                : {
                    metadata: {
                      validated: true,
                      kind: content.media.find((m) => m.id === filters['id'])?.kind,
                      mime: content.media.find((m) => m.id === filters['id'])?.mime,
                    },
                  },
          error: null,
        }),
      };
      return query;
    });
    const copy = vi.fn(async () => ({ data: {}, error: null }));
    fakeDb.storage.from.mockReturnValue({
      copy,
      getPublicUrl: (path: string) => ({
        data: { publicUrl: 'https://example.supabase.co/public/' + path },
      }),
    });
    fakeDb.rpc.mockResolvedValue({ data: 1, error: null });
    expect(
      (
        await worker.fetch(
          req('/admin/spaces/aquario-marinho/publish', 'POST', { revision: 4 }, token),
          env,
        )
      ).status,
    ).toBe(200);
    expect(copy).toHaveBeenCalledTimes(6);
    expect(fakeDb.rpc).toHaveBeenCalledTimes(1);
    const args = fakeDb.rpc.mock.calls[0][1];
    expect(args.p_content.media[2].caption).toBe(
      'https://example.supabase.co/public/space/caption.vtt',
    );
    expect(args.p_content.media[2].poster).toBe(
      'https://example.supabase.co/public/space/image.png',
    );
    expect(args.p_content.media[3].url).toBe('https://example.supabase.co/public/space/text.pdf');
    expect(args.p_content.media[4].url).toBe(
      'https://example.supabase.co/public/space/activity.pdf',
    );
    expect(args.p_content.media[5].mime).toBe('audio/wav');
    expect(args.p_content.media[5].caption).toBe('');
    expect(args.p_content.media[5].poster).toBe('');
    expect(args.p_draft.media[2].caption).toBe(ids[1]);
    fakeDb.rpc.mockClear();
    content.media[5].mime = 'video/mp4';
    const rejected = await worker.fetch(
      req('/admin/spaces/aquario-marinho/publish', 'POST', { revision: 4 }, token),
      env,
    );
    expect(rejected.status).toBe(422);
    expect(fakeDb.rpc).not.toHaveBeenCalled();
    content.media[5].enabled = false;
    expect(
      (
        await worker.fetch(
          req('/admin/spaces/aquario-marinho/publish', 'POST', { revision: 4 }, token),
          env,
        )
      ).status,
    ).toBe(200);
    expect(
      fakeDb.rpc.mock.calls[0][1].p_content.media.some(
        (m: { kind: string }) => m.kind === 'audiodescricao',
      ),
    ).toBe(false);
    content.media[5].mime = 'audio/wav';
    content.media[5].enabled = true;
    fakeDb.rpc.mockClear();
    fakeDb.storage.from.mockReturnValue({
      copy: async () => ({ data: null, error: Error('failed') }),
      exists: async () => ({ data: false, error: null }),
    });
    expect(
      (
        await worker.fetch(
          req('/admin/spaces/aquario-marinho/publish', 'POST', { revision: 4 }, token),
          env,
        )
      ).status,
    ).toBe(503);
    expect(fakeDb.rpc).not.toHaveBeenCalled();
  });
  it('refuses weak or unconfigured server secrets', async () => {
    const { env } = fixture();
    env.ADMIN_PASSWORD = '1234';
    expect(
      (await worker.fetch(req('/admin/session', 'POST', { password: '1234' }), env)).status,
    ).toBe(503);
  });
  it('supports exact CORS headers without wildcard', async () => {
    const { env } = fixture();
    const r = await worker.fetch(req('/admin/session', 'OPTIONS'), env);
    expect(r.status).toBe(204);
    expect(r.headers.get('Access-Control-Allow-Origin')).toBe('https://example.github.io');
    expect(r.headers.get('Cache-Control')).toBe('no-store');
  });
});
describe('content and binary validation', () => {
  it('keeps exactly nine stable identifiers', () => {
    expect(SPACES).toHaveLength(9);
    expect(new Set(SPACES.map((s) => s[0])).size).toBe(9);
  });
  it('rejects executable URLs and oversized text', () => {
    expect(
      contentSchema.safeParse({
        ...emptyContent(),
        blocks: [{ type: 'link', text: 'bad', url: 'javascript:alert(1)' }],
      }).success,
    ).toBe(false);
    expect(
      contentSchema.safeParse({
        ...emptyContent(),
        blocks: [{ type: 'paragraph', text: 'x'.repeat(10001) }],
      }).success,
    ).toBe(false);
  });
  it('allows text containing tags because renderer uses interpolation', () => {
    expect(
      contentSchema.parse({
        ...emptyContent(),
        blocks: [{ type: 'paragraph', text: '<script>alert(1)</script>' }],
      }).blocks[0].text,
    ).toContain('<script>');
  });
  it('accepts persisted caption and poster references when re-publishing drafts', () => {
    const id = 'ed2f07ae-e9c6-4c71-923c-26422c5ac099';
    const c = contentSchema.parse({
      ...emptyContent(),
      media: [{ id, kind: 'libras', caption: id, poster: id }],
    });
    expect(c.media[0].caption).toBe(id);
    expect(c.media[0].poster).toBe(id);
  });
  it('checks magic bytes rather than declared MIME', () => {
    expect(signature('image/png', new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
    expect(signature('image/png', new TextEncoder().encode('<svg onload=alert(1)>'))).toBe(false);
    expect(signature('application/pdf', new TextEncoder().encode('%PDF-1.7\n'))).toBe(true);
    expect(signature('application/pdf', new TextEncoder().encode('%PDF-2.0\r\n'))).toBe(true);
    expect(signature('application/pdf', new TextEncoder().encode('<html>fake.pdf</html>'))).toBe(
      false,
    );
    expect(signature('application/pdf', new TextEncoder().encode('%PDF-FAKE'))).toBe(false);
    expect(signature('image/svg+xml', new TextEncoder().encode('<svg>'))).toBe(false);
    expect(signature('video/mp4', new TextEncoder().encode('0000ftypisom'))).toBe(true);
  });
  it('retains a durable counter across Guard instances', async () => {
    const records = new Map();
    const storage = {
      get: async (k: string) => records.get(k),
      put: async (k: string, v: unknown) => {
        records.set(k, v);
      },
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(storage),
      setAlarm: async () => {},
    };
    const state = { storage } as unknown as DurableObjectState;
    for (let i = 0; i < 6; i++) {
      const g = new Guard(state);
      const r = await g.fetch(
        new Request('https://guard', {
          method: 'POST',
          body: JSON.stringify({ op: 'rate', key: 'ip', limit: 5 }),
        }),
      );
      expect(await r.json()).toBe(i < 5);
    }
  });
});

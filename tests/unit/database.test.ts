import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { emptyContent } from '../../shared/content';
let db: PGlite;
let id: string;
let originalMataId: string;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);grant usage on schema public to anon,authenticated,service_role;`,
  );
  for (const file of ['0001_init.sql', '0002_publication.sql']) {
    const sql = (await readFile('supabase/migrations/' + file, 'utf8')).replace(
      'create extension if not exists pgcrypto;',
      '',
    );
    await db.exec(sql);
  }
  originalMataId = (
    await db.query<{ id: string }>("select id from spaces where slug='diorama-mata-atlantica'")
  ).rows[0].id;
  await db.query('insert into space_drafts(space_id,content) values($1,$2)', [
    originalMataId,
    JSON.stringify(emptyContent()),
  ]);
  const correction = await readFile('supabase/migrations/0003_mata_atlantica_2.sql', 'utf8');
  await db.exec(correction);
  await db.exec(correction);
  id = (await db.query<{ id: string }>("select id from spaces where slug='aquario-marinho'"))
    .rows[0].id;
}, 60000);
afterAll(async () => {
  await db.close();
});
describe('PostgreSQL migrations and permission boundaries', () => {
  it('seeds exactly nine fixed spaces and private staging', async () => {
    expect((await db.query('select * from spaces')).rows).toHaveLength(9);
    expect(
      (
        await db.query<{ public: boolean }>(
          "select public from storage.buckets where id='csb-staging-media'",
        )
      ).rows[0].public,
    ).toBe(false);
  });
  it('renames the first diorama without losing its ID or draft and adds the second once', async () => {
    const rows = (
      await db.query<{ id: string; slug: string; title: string }>(
        "select id,slug,title from spaces where slug like 'diorama-mata-atlantica%' order by position",
      )
    ).rows;
    expect(rows).toEqual([
      { id: originalMataId, slug: 'diorama-mata-atlantica', title: 'Diorama da Mata Atlântica 1' },
      {
        id: expect.any(String),
        slug: 'diorama-mata-atlantica-2',
        title: 'Diorama da Mata Atlântica 2',
      },
    ]);
    expect(
      (
        await db.query<{ content: unknown }>('select content from space_drafts where space_id=$1', [
          originalMataId,
        ])
      ).rows[0].content,
    ).toEqual(emptyContent());
  });
  it('anonymous may read official spaces but not drafts or perform mutations/RPCs', async () => {
    await db.exec('set role anon');
    try {
      expect((await db.query('select * from spaces')).rows).toHaveLength(9);
      for (const sql of [
        'select * from space_drafts',
        'select * from space_revisions',
        "insert into spaces(slug,title,position) values ('attack','attack',99)",
        `select save_space_draft('${id}','{}',0)`,
        `select publish_space('${id}','{}','{}',0)`,
      ])
        await expect(db.exec(sql)).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec('reset role');
    }
  });
  it('saves a private draft with compare-and-swap, publishes atomically, rejects stale writes', async () => {
    const draft = {
      ...emptyContent(),
      blocks: [{ type: 'paragraph', text: 'Texto para teste de transação', bold: false, url: '' }],
    };
    const payload = JSON.stringify(draft);
    await db.exec('set role service_role');
    try {
      expect(
        (await db.query<{ v: number }>('select save_space_draft($1,$2,0) as v', [id, payload]))
          .rows[0].v,
      ).toBe(1);
      await expect(db.query('select save_space_draft($1,$2,0)', [id, payload])).rejects.toThrow(
        'revision conflict',
      );
    } finally {
      await db.exec('reset role');
    }
    await db.exec('set role anon');
    expect((await db.query('select * from space_published')).rows).toHaveLength(0);
    await db.exec('reset role');
    await db.exec('set role service_role');
    await db.query('select publish_space($1,$2,$2,1)', [id, payload]);
    await expect(db.query('select publish_space($1,$2,$2,1)', [id, payload])).rejects.toThrow(
      'revision conflict',
    );
    await db.exec('reset role');
    await db.exec('set role anon');
    const rows = (
      await db.query<{ content: unknown; revision: number }>(
        'select content,revision from space_published',
      )
    ).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].content).toEqual(draft);
    expect(rows[0].revision).toBe(1);
    await db.exec('reset role');
    expect((await db.query('select * from space_revisions')).rows).toHaveLength(1);
    expect((await db.query('select * from publish_events')).rows).toHaveLength(1);
  });
});

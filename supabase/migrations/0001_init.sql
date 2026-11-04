-- Ciência Sem Barreiras V4 - ESQUELETO SQL para Codex adaptar antes do deploy.
-- Não contém credenciais, política de upload nem funções de publicação completas.
create extension if not exists pgcrypto;

create table if not exists public.spaces (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique,
 title text not null,
 position int not null unique,
 created_at timestamptz not null default now(),
 constraint space_slug_format check (slug ~ '^[a-z0-9-]+$')
);
create table if not exists public.space_published (
 space_id uuid primary key references public.spaces(id) on delete cascade,
 content jsonb not null default '{}'::jsonb,
 revision bigint not null default 1,
 published_at timestamptz,
 updated_at timestamptz not null default now()
);
create table if not exists public.space_drafts (
 space_id uuid primary key references public.spaces(id) on delete cascade,
 content jsonb not null default '{}'::jsonb,
 base_revision bigint,
 updated_at timestamptz not null default now()
);
create table if not exists public.space_revisions (
 id bigint generated always as identity primary key,
 space_id uuid not null references public.spaces(id) on delete cascade,
 revision bigint not null,
 content jsonb not null,
 created_at timestamptz not null default now(),
 unique(space_id,revision)
);
create table if not exists public.space_media (
 id uuid primary key default gen_random_uuid(),
 space_id uuid not null references public.spaces(id) on delete cascade,
 kind text not null check(kind in ('image','audio','libras_video','audiodescricao_video','caption')),
 stage text not null check(stage in ('staging','published','archived')) default 'staging',
 storage_bucket text,
 object_path text,
 external_url text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 constraint media_source_check check ((storage_bucket is not null and object_path is not null) or external_url is not null)
);

-- IMPORTANT: grant SELECT only to public reading tables; deny direct mutations.
alter table public.spaces enable row level security;
alter table public.space_published enable row level security;
alter table public.space_drafts enable row level security;
alter table public.space_revisions enable row level security;
alter table public.space_media enable row level security;

revoke all on public.spaces from anon, authenticated;
revoke all on public.space_published from anon, authenticated;
revoke all on public.space_drafts from anon, authenticated;
revoke all on public.space_revisions from anon, authenticated;
revoke all on public.space_media from anon, authenticated;

grant select on public.spaces to anon, authenticated;
grant select on public.space_published to anon, authenticated;

create policy "read known spaces" on public.spaces for select to anon, authenticated using (true);
create policy "read published only" on public.space_published for select to anon, authenticated using (published_at is not null);
-- Draft and revision/media tables have no public policies; only Worker service-role may access.

insert into public.spaces(slug,title,position) values
('aquario-nascente-rio','Aquário Nascente do Rio – Paludário',1),
('aquario-fundo-rio','Aquário Fundo do Rio – Jumbo',2),
('aquario-lagoa','Aquário Lagoa',3),
('aquario-marinho','Aquário Marinho',4),
('aquario-praia','Aquário Praia',5),
('diorama-manguezal','Diorama do Manguezal',6),
('diorama-restinga','Diorama da Restinga',7),
('diorama-mata-atlantica','Diorama da Mata Atlântica',8)
on conflict(slug) do update set title=excluded.title,position=excluded.position;

-- Worker MUST implement transactional publication (RPC), storage policies, signed uploads,
-- validation, persistence, revision history and cleanup before production.

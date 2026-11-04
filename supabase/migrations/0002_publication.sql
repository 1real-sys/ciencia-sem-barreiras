-- Apply AFTER 0001_init.sql. Only service_role can execute these RPCs.
alter table public.space_drafts add column version bigint not null default 1;
create table public.publish_events(id bigint generated always as identity primary key,space_id uuid references public.spaces(id),revision bigint not null,created_at timestamptz not null default now());
alter table public.publish_events enable row level security;
revoke all on public.publish_events from anon,authenticated;
create or replace function public.save_space_draft(p_space uuid,p_content jsonb,p_expected bigint) returns bigint language plpgsql security definer set search_path=public as $$
declare current_version bigint; next_version bigint;
begin
 perform 1 from public.spaces where id=p_space for update;
 if not found then raise exception 'unknown space'; end if;
 select version into current_version from public.space_drafts where space_id=p_space;
 if coalesce(current_version,0)<>p_expected then raise exception 'revision conflict'; end if;
 next_version:=coalesce(current_version,0)+1;
 insert into public.space_drafts(space_id,content,version,updated_at) values(p_space,p_content,next_version,now()) on conflict(space_id) do update set content=excluded.content,version=excluded.version,updated_at=excluded.updated_at;
 return next_version;
end;$$;
create or replace function public.publish_space(p_space uuid,p_content jsonb,p_draft jsonb,p_expected bigint) returns bigint language plpgsql security definer set search_path=public as $$
declare draft_version bigint; previous_revision bigint; new_revision bigint;
begin
 perform 1 from public.spaces where id=p_space for update;
 select version into draft_version from public.space_drafts where space_id=p_space;
 if draft_version is null or draft_version<>p_expected then raise exception 'revision conflict'; end if;
 select revision into previous_revision from public.space_published where space_id=p_space;
 new_revision:=coalesce(previous_revision,0)+1;
 insert into public.space_revisions(space_id,revision,content) values(p_space,new_revision,p_draft);
 insert into public.space_published(space_id,content,revision,published_at,updated_at) values(p_space,p_content,new_revision,now(),now()) on conflict(space_id) do update set content=excluded.content,revision=excluded.revision,published_at=excluded.published_at,updated_at=excluded.updated_at;
 update public.space_drafts set content=p_draft,base_revision=new_revision,version=version+1,updated_at=now() where space_id=p_space;
 insert into public.publish_events(space_id,revision) values(p_space,new_revision);
 return new_revision;
end;$$;
revoke all on function public.save_space_draft(uuid,jsonb,bigint) from public,anon,authenticated;
revoke all on function public.publish_space(uuid,jsonb,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.save_space_draft(uuid,jsonb,bigint) to service_role;
grant execute on function public.publish_space(uuid,jsonb,jsonb,bigint) to service_role;
grant all on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('csb-staging-media','csb-staging-media',false,52428800,array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/ogg','video/mp4','video/webm','text/vtt']),
('csb-public-media','csb-public-media',true,52428800,array['image/jpeg','image/png','image/webp','audio/mpeg','audio/mp4','audio/ogg','video/mp4','video/webm','text/vtt'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- No INSERT/UPDATE/DELETE policy on storage.objects for anon or authenticated.
-- Use a dedicated Supabase project: pre-existing permissive policies must be reviewed.

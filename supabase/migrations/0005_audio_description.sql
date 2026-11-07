-- Apply after 0004. Preserve existing objects and legacy media references.
begin;
alter table public.space_media drop constraint if exists space_media_kind_check;
alter table public.space_media add constraint space_media_kind_check
  check (kind in ('image','audio','libras_video','audiodescricao_video','audiodescricao_audio','caption','text_pdf','activity_pdf'));

update storage.buckets
set allowed_mime_types = (
  select array_agg(distinct mime order by mime)
  from unnest(allowed_mime_types || array['audio/mpeg','audio/mp4','audio/ogg','audio/aac','audio/wav','audio/x-ms-wma','audio/flac']) as mime
)
where id in ('csb-staging-media', 'csb-public-media')
  and allowed_mime_types is not null;
commit;

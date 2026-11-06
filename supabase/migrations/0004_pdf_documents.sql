-- Apply after 0003. Preserve existing media, permissions and bucket visibility.
begin;
alter table public.space_media drop constraint if exists space_media_kind_check;
alter table public.space_media add constraint space_media_kind_check
  check (kind in ('image','audio','libras_video','audiodescricao_video','caption','text_pdf','activity_pdf'));

update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'application/pdf')
where id in ('csb-staging-media', 'csb-public-media')
  and allowed_mime_types is not null
  and not ('application/pdf' = any(allowed_mime_types));
commit;

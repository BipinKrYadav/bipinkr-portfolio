-- =====================================================================
-- Admin backend foundation · 7 of 7 · private Storage buckets
--
-- Both buckets are private: no public URLs, no anonymous access. Objects are
-- read by admins through short-lived signed URLs and by server-side
-- functions with the service role. There are no update or delete policies —
-- a replacement is uploaded as a new object, and nothing is hard-deleted
-- from the admin.
--
-- Path conventions (enforced by the admin application):
--   media-originals/<media_assets.id>/v<version>/<file name>
--   evidence/<evidence_files.id>/<file name>
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'media-originals', 'media-originals', false, 10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  ),
  (
    'evidence', 'evidence', false, 20971520,
    array[
      'text/csv', 'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  )
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins can read media originals" on storage.objects
  for select to authenticated
  using (bucket_id = 'media-originals' and (select private.is_admin()));

create policy "Admins can upload media originals" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media-originals' and (select private.is_admin()));

create policy "Admins can read evidence files" on storage.objects
  for select to authenticated
  using (bucket_id = 'evidence' and (select private.is_admin()));

create policy "Admins can upload evidence files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidence' and (select private.is_admin()));

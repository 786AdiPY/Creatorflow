-- Storage bucket for uploaded content assets (video/image source files).
-- Public bucket, open read/write — matches the no-auth single-workspace MVP
-- (see 0001_init.sql). Scope this to auth.uid() folders once accounts exist.

insert into storage.buckets (id, name, public)
values ('content-assets', 'content-assets', true)
on conflict (id) do nothing;

create policy "content-assets insert" on storage.objects
  for insert to public
  with check (bucket_id = 'content-assets');

create policy "content-assets select" on storage.objects
  for select to public
  using (bucket_id = 'content-assets');

create policy "content-assets delete" on storage.objects
  for delete to public
  using (bucket_id = 'content-assets');

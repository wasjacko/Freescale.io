-- Avatar storage: public bucket capped at 2 MB, RLS so users can only write
-- to their own folder (named after their auth uid).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars'::text,
  'avatars'::text,
  true,
  2097152,
  array['image/png','image/jpeg','image/webp','image/gif']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars read public') then
    create policy "avatars read public" on storage.objects for select using (bucket_id = 'avatars');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars insert own') then
    create policy "avatars insert own" on storage.objects for insert
      with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars update own') then
    create policy "avatars update own" on storage.objects for update
      using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='avatars delete own') then
    create policy "avatars delete own" on storage.objects for delete
      using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end $$;

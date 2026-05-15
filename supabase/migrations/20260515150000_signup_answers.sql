-- Capture the value-first signup wizard answers on the profile row.
alter table public.profiles
  add column if not exists role text,
  add column if not exists daily_volume text,
  add column if not exists top_pain text,
  add column if not exists channels_picked text[];

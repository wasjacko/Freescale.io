-- Email signature appended to outgoing replies. Editable in
-- Settings → Profil, auto-prepended (with --\n separator) to the body
-- of every email sent through the EmailComposer.
alter table public.profiles
  add column if not exists signature text;

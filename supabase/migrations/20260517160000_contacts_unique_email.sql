-- Unique (workspace_id, email) for upsert-by-email in the Gmail sync path.
-- The batched syncGmail refactor relies on Supabase's upsert(onConflict)
-- to dedupe contacts across parallel batches; without a matching unique
-- constraint Supabase falls back to plain INSERT and we get duplicate
-- contacts whenever a sender appears in multiple threads in the same batch.
--
-- partial index (where email is not null) matches the existing
-- contacts_email_idx semantics — contacts without an email don't need
-- dedup by email.
create unique index if not exists contacts_workspace_email_unique
  on public.contacts(workspace_id, email)
  where email is not null;

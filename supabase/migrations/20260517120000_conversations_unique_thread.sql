-- Prevent two conversations from sharing the same channel thread inside a
-- single workspace. Without this, two concurrent syncs could both INSERT and
-- we'd render the same Gmail thread twice in the inbox with messages split
-- across both rows.
--
-- A regular (non-partial) unique index is intentional: Supabase's upsert
-- onConflict inference doesn't reliably target partial indexes, and Postgres
-- treats NULLs as distinct in unique indexes anyway, so rows without an
-- external_thread_id (legacy demo rows, future manual conversations…) are
-- still allowed to coexist.
drop index if exists conversations_thread_unique;
create unique index conversations_thread_unique
  on public.conversations(workspace_id, channel_account_id, external_thread_id);

-- Prevent two conversations from sharing the same Gmail (or any channel)
-- thread inside the same workspace. Without this, two concurrent syncs
-- could both insert and we'd end up rendering the same thread twice in the
-- inbox with messages split between them.
create unique index if not exists conversations_thread_unique
  on public.conversations(workspace_id, channel_account_id, external_thread_id)
  where external_thread_id is not null;

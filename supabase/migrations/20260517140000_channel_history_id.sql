-- Gmail History API cursor per channel account.
-- Holds the last historyId we successfully synced from. On the next tick
-- we call users.history.list?startHistoryId=<this> instead of re-listing
-- every message. Resets to NULL whenever Gmail returns a 404 (cursor
-- aged out, > ~7 days) — sync code then does a fresh full sync.
alter table public.channel_accounts
  add column if not exists history_id text;

-- Track sync errors per channel so the UI can surface "Your Gmail
-- needs reconnecting" banners and last-sync diagnostics.
--
-- `status` already exists on channel_accounts (text). It now accepts a
-- new value 'needs_reauth' that syncGmail sets when Gmail's token
-- refresh hits 401 / invalid_grant — UI flips to a reconnect CTA.
alter table public.channel_accounts
  add column if not exists last_sync_error text,
  add column if not exists last_sync_error_at timestamptz;

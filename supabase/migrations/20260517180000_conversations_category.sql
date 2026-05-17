-- AI-classified category per conversation (Mue triage).
-- Values: 'client' / 'promo' / 'notif' / 'other'. NULL = not yet classified.
--
-- The category drives the inbox tabs (Clients / Promos / Notifs / Autres):
-- by default Freescale shows only client mail, with the noisy stuff
-- collapsed behind dedicated tabs. This is the central value-prop of the
-- app — "I only want to see what matters" — so the column is part of
-- conversations directly (not a separate table) for fast tab filtering.
alter table public.conversations
  add column if not exists category text,
  add column if not exists category_confidence real;

create index if not exists conversations_category_idx
  on public.conversations(workspace_id, category)
  where category is not null;

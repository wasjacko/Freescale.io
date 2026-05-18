-- ============================================================
-- Freescale — Apply all pending migrations in one go
-- ============================================================
--
-- Copy this entire file into Supabase Dashboard → SQL Editor → New
-- query → paste → Run. It's idempotent (uses CREATE IF NOT EXISTS /
-- ADD COLUMN IF NOT EXISTS everywhere), so running it twice is safe.
--
-- After running, the app's Gmail connection + inbox should work.
-- Until you run it, the app falls back to a "no extras" mode where
-- the inbox loads with init-schema columns only (no category tabs,
-- no snooze filter, no tag chips) — but at least it loads.
--
-- Source migrations bundled (chronological):
--   20260517140000_channel_history_id.sql
--   20260517180000_conversations_category.sql
--   20260518100000_profile_objective_usage.sql
--   20260518140000_channel_sync_error.sql
--   20260518160000_conversation_snooze.sql
--   20260518180000_profile_signature.sql
--   20260518200000_conversation_tags.sql
--   20260518220000_email_templates.sql
--   20260518240000_tasks_subtasks_and_order.sql
--   20260518260000_conversations_active_view.sql
-- ============================================================

-- 1. channel_accounts: history_id for incremental Gmail sync
alter table public.channel_accounts
  add column if not exists history_id text;

-- 2. conversations: Mue category classification
alter table public.conversations
  add column if not exists category text,
  add column if not exists category_confidence real;

create index if not exists conversations_category_idx
  on public.conversations(workspace_id, category)
  where category is not null;

-- 3. profiles: onboarding objective + usage_mode
alter table public.profiles
  add column if not exists objective text,
  add column if not exists usage_mode text;

-- 4. channel_accounts: sync error tracking (status accepts new value 'needs_reauth')
alter table public.channel_accounts
  add column if not exists last_sync_error text,
  add column if not exists last_sync_error_at timestamptz;

-- 5. conversations: snooze
alter table public.conversations
  add column if not exists snoozed_until timestamptz;

create index if not exists conversations_snooze_idx
  on public.conversations(workspace_id, snoozed_until)
  where snoozed_until is not null;

-- 6. profiles: email signature
alter table public.profiles
  add column if not exists signature text;

-- 7. conversations: tags (text[] + GIN index)
alter table public.conversations
  add column if not exists tags text[] not null default '{}'::text[];

create index if not exists conversations_tags_gin
  on public.conversations using gin (tags);

-- 8. email_templates: workspace-scoped reply snippets
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_templates enable row level security;

-- Drop and recreate policies idempotently
drop policy if exists "email_templates: members can read"   on public.email_templates;
drop policy if exists "email_templates: members can insert" on public.email_templates;
drop policy if exists "email_templates: members can update" on public.email_templates;
drop policy if exists "email_templates: members can delete" on public.email_templates;

create policy "email_templates: members can read"
  on public.email_templates for select
  using (public.is_workspace_member(workspace_id));

create policy "email_templates: members can insert"
  on public.email_templates for insert
  with check (public.is_workspace_member(workspace_id));

create policy "email_templates: members can update"
  on public.email_templates for update
  using (public.is_workspace_member(workspace_id));

create policy "email_templates: members can delete"
  on public.email_templates for delete
  using (public.is_workspace_member(workspace_id));

create index if not exists email_templates_workspace_idx
  on public.email_templates(workspace_id, updated_at desc);

-- 9. tasks: subtasks (parent_task_id) + manual reorder (sortable_index)
alter table public.tasks
  add column if not exists parent_task_id uuid references public.tasks(id) on delete cascade,
  add column if not exists sortable_index double precision;

-- Backfill sortable_index for existing rows so initial order is preserved
update public.tasks
   set sortable_index = extract(epoch from coalesce(created_at, now())) * 1000
 where sortable_index is null;

create index if not exists tasks_workspace_order_idx
  on public.tasks(workspace_id, sortable_index);

create index if not exists tasks_parent_idx
  on public.tasks(parent_task_id)
  where parent_task_id is not null;

-- 10. conversations_active view — server-side snooze filter
create or replace view public.conversations_active
with (security_invoker = on)
as
select c.*
  from public.conversations c
 where c.snoozed_until is null
    or c.snoozed_until <= now();

grant select on public.conversations_active to authenticated;

comment on view public.conversations_active is
  'Conversations with currently-expired (or never-set) snoozed_until.';

-- ============================================================
-- Done. Verify by running these one-liners:
--
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='conversations'
--      and column_name in ('category','snoozed_until','tags');
--   -- should return 3 rows
--
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='channel_accounts'
--      and column_name in ('history_id','last_sync_error','last_sync_error_at');
--   -- should return 3 rows
-- ============================================================

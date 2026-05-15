-- =============================================================================
-- Freescale — initial schema
-- =============================================================================
-- Multi-tenant inbox SaaS:
--   profiles → 1:1 with auth.users
--   workspaces → user can have many (perso, agency, …)
--   workspace_members → who has access to which workspace + role
--   channel_accounts → OAuth tokens per workspace (Gmail/Slack/IG/…)
--   contacts → people the user communicates with (merged cross-channel)
--   conversations → message thread with a contact on a channel
--   messages → unified schema across channels
--   tasks → manual or AI-extracted
--   calendar_events
--   mue_memories → AI Knowledge base with pgvector embeddings
-- =============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists "vector";    -- pgvector for embeddings

-- Enums -----------------------------------------------------------------------
create type channel_kind as enum (
  'gmail', 'instagram', 'whatsapp', 'slack', 'discord',
  'x', 'linkedin', 'telegram', 'messenger', 'sms'
);

create type message_direction as enum ('in', 'out');

create type task_status as enum ('todo', 'in_progress', 'awaiting_reply', 'done');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');

create type member_role as enum ('owner', 'admin', 'member');

create type plan_tier as enum ('free', 'pro', 'team');

-- =============================================================================
-- Profiles (1:1 with auth.users)
-- =============================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  timezone text default 'Europe/Paris',
  locale text default 'fr',
  plan plan_tier not null default 'free',
  stripe_customer_id text,
  trial_ends_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create profile on signup ----------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  -- Bootstrap a personal workspace
  insert into public.workspaces (owner_id, name)
  values (new.id, 'Personal');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Workspaces & membership (multi-tenant)
-- =============================================================================
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text unique,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role member_role not null default 'member',
  added_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- Auto-add owner as member when workspace is created --------------------------
create or replace function public.add_workspace_owner_as_member()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.add_workspace_owner_as_member();

-- Helper: is the current user a member of this workspace? ---------------------
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

-- =============================================================================
-- Channel accounts (OAuth tokens — encrypted at app layer with libsodium)
-- =============================================================================
create table public.channel_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind channel_kind not null,
  external_id text not null,           -- email address, slack team_id, …
  display_name text,
  -- Encrypted JSON blob holding access_token / refresh_token / expires_at.
  -- We never store plain tokens.
  encrypted_tokens text,
  status text not null default 'active',  -- 'active' | 'expired' | 'revoked'
  last_synced_at timestamptz,
  connected_at timestamptz not null default now(),
  unique (workspace_id, kind, external_id)
);

create index channel_accounts_workspace_idx on public.channel_accounts(workspace_id);

-- =============================================================================
-- Contacts (merged cross-channel)
-- =============================================================================
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  display_name text not null,
  email text,
  phone text,
  avatar_url text,
  notes text,
  starred boolean not null default false,
  created_at timestamptz not null default now()
);

create index contacts_workspace_idx on public.contacts(workspace_id);
create index contacts_email_idx on public.contacts(email) where email is not null;

-- Each contact can be reachable via multiple channel handles
create table public.contact_handles (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  kind channel_kind not null,
  handle text not null,             -- email / @username / phone / slack uid
  unique (kind, handle)
);

create index contact_handles_contact_idx on public.contact_handles(contact_id);

-- =============================================================================
-- Conversations & messages
-- =============================================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  channel_account_id uuid references public.channel_accounts(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  external_thread_id text,             -- Gmail threadId, Slack channel id, …
  subject text,
  preview text,
  last_message_at timestamptz not null default now(),
  unread_count int not null default 0,
  archived boolean not null default false,
  starred boolean not null default false,
  created_at timestamptz not null default now()
);

create index conversations_workspace_last_msg_idx
  on public.conversations(workspace_id, last_message_at desc)
  where archived = false;

create index conversations_unread_idx
  on public.conversations(workspace_id)
  where unread_count > 0 and archived = false;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  direction message_direction not null,
  external_id text,                    -- provider's message id (idempotency)
  body_text text,
  body_html text,
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  read_at timestamptz,
  metadata jsonb default '{}'::jsonb
);

create index messages_conversation_sent_idx
  on public.messages(conversation_id, sent_at);

create unique index messages_external_id_unique
  on public.messages(conversation_id, external_id)
  where external_id is not null;

create table public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  filename text not null,
  mime_type text,
  size_bytes bigint,
  storage_path text,                   -- Cloudflare R2 key
  preview_url text,
  created_at timestamptz not null default now()
);

create index message_attachments_message_idx on public.message_attachments(message_id);

-- =============================================================================
-- Tasks
-- =============================================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  due_at timestamptz,
  completed_at timestamptz,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now()
);

create index tasks_workspace_status_idx on public.tasks(workspace_id, status);

-- =============================================================================
-- Calendar events
-- =============================================================================
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  channel channel_kind,
  conversation_id uuid references public.conversations(id) on delete set null,
  external_id text,
  source text,
  created_at timestamptz not null default now()
);

create index calendar_events_workspace_starts_idx
  on public.calendar_events(workspace_id, starts_at);

-- =============================================================================
-- Mue memories (AI Knowledge with embeddings)
-- =============================================================================
create table public.mue_memories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null,                  -- 'client' | 'project' | 'preference' | 'process' | 'fact'
  content text not null,
  source_conversation_id uuid references public.conversations(id) on delete set null,
  embedding vector(1536),              -- OpenAI text-embedding-3-small dim
  created_at timestamptz not null default now()
);

create index mue_memories_workspace_idx on public.mue_memories(workspace_id);
create index mue_memories_embedding_idx
  on public.mue_memories using hnsw (embedding vector_cosine_ops);

-- =============================================================================
-- RLS — everyone gets locked down by default
-- =============================================================================
alter table public.profiles            enable row level security;
alter table public.workspaces          enable row level security;
alter table public.workspace_members   enable row level security;
alter table public.channel_accounts    enable row level security;
alter table public.contacts            enable row level security;
alter table public.contact_handles     enable row level security;
alter table public.conversations       enable row level security;
alter table public.messages            enable row level security;
alter table public.message_attachments enable row level security;
alter table public.tasks               enable row level security;
alter table public.calendar_events     enable row level security;
alter table public.mue_memories        enable row level security;

-- Profiles: each user reads/edits their own row -------------------------------
create policy "profiles: read own"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id);

-- Workspaces: owner-or-member can read; owner can update/delete ---------------
create policy "workspaces: members can read"
  on public.workspaces for select
  using (public.is_workspace_member(id));

create policy "workspaces: owner can update"
  on public.workspaces for update
  using (owner_id = auth.uid());

create policy "workspaces: any auth user can create"
  on public.workspaces for insert
  with check (owner_id = auth.uid());

create policy "workspaces: owner can delete"
  on public.workspaces for delete
  using (owner_id = auth.uid());

-- workspace_members ----------------------------------------------------------
create policy "wm: members can read"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

create policy "wm: owner can manage"
  on public.workspace_members for all
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.owner_id = auth.uid()
    )
  );

-- For all workspace-scoped tables: members can SELECT/INSERT/UPDATE/DELETE ---
do $$
declare
  t text;
begin
  foreach t in array array[
    'channel_accounts','contacts','conversations','messages',
    'message_attachments','tasks','calendar_events','mue_memories'
  ] loop
    execute format($f$
      create policy "%1$s: members can read"   on public.%1$s for select
        using (public.is_workspace_member(workspace_id));
      create policy "%1$s: members can insert" on public.%1$s for insert
        with check (public.is_workspace_member(workspace_id));
      create policy "%1$s: members can update" on public.%1$s for update
        using (public.is_workspace_member(workspace_id));
      create policy "%1$s: members can delete" on public.%1$s for delete
        using (public.is_workspace_member(workspace_id));
    $f$, t);
  end loop;
end$$;

-- contact_handles (no workspace_id directly — joins via contact) -------------
create policy "contact_handles: via contact"
  on public.contact_handles for all
  using (
    exists (
      select 1 from public.contacts c
      where c.id = contact_id and public.is_workspace_member(c.workspace_id)
    )
  );

-- =============================================================================
-- Updated_at touch trigger for profiles
-- =============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

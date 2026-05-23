alter table public.profiles
  add column if not exists mue_persona text,
  add column if not exists mue_style_profile text,
  add column if not exists mue_style_updated_at timestamptz,
  add column if not exists daily_digest_enabled boolean not null default false,
  add column if not exists daily_digest_last_sent_at timestamptz;

create table if not exists public.mue_chat_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'mue')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mue_chat_messages_workspace_idx
  on public.mue_chat_messages(workspace_id, created_at desc);

create index if not exists mue_chat_messages_conversation_idx
  on public.mue_chat_messages(workspace_id, conversation_id, created_at desc);

alter table public.mue_chat_messages enable row level security;

create policy "mue_chat_messages: members can read"
  on public.mue_chat_messages for select
  using (public.is_workspace_member(workspace_id));

create policy "mue_chat_messages: members can insert"
  on public.mue_chat_messages for insert
  with check (public.is_workspace_member(workspace_id));

create policy "mue_chat_messages: members can delete"
  on public.mue_chat_messages for delete
  using (public.is_workspace_member(workspace_id));

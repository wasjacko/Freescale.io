-- Phase 5 — Collaboration
-- Workspaces multiples, invitations, roles, assignments, internal notes,
-- mentions, activity logs, team notification settings and granular gates.

alter table public.profiles
  add column if not exists active_workspace_id uuid references public.workspaces(id) on delete set null;

alter table public.conversations
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null;

alter table public.email_templates
  add column if not exists visibility text not null default 'team'
  check (visibility in ('personal', 'team'));

create index if not exists conversations_assigned_to_idx
  on public.conversations(workspace_id, assigned_to)
  where assigned_to is not null and archived = false;

create or replace function public.workspace_member_role(ws_id uuid, uid uuid default auth.uid())
returns member_role
language sql
security definer
stable
set search_path = public
as $$
  select wm.role
  from public.workspace_members wm
  where wm.workspace_id = ws_id and wm.user_id = uid
  limit 1;
$$;

create or replace function public.is_workspace_admin(ws_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(public.workspace_member_role(ws_id) in ('owner', 'admin'), false);
$$;

create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role member_role not null default 'member',
  token_hash text not null unique,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create index if not exists workspace_invites_workspace_idx
  on public.workspace_invites(workspace_id, created_at desc);

create unique index if not exists workspace_invites_pending_email_idx
  on public.workspace_invites(workspace_id, lower(email))
  where accepted_at is null;

create table if not exists public.conversation_internal_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  mention_handles text[] not null default '{}'::text[],
  mentioned_user_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now()
);

create index if not exists conversation_internal_notes_conversation_idx
  on public.conversation_internal_notes(conversation_id, created_at desc);

create index if not exists conversation_internal_notes_mentions_gin
  on public.conversation_internal_notes using gin (mentioned_user_ids);

create table if not exists public.conversation_activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists conversation_activity_events_conversation_idx
  on public.conversation_activity_events(conversation_id, created_at desc);

create table if not exists public.team_notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete cascade,
  kind text not null check (kind in ('mention', 'assignment', 'invite')),
  body text not null,
  read_at timestamptz,
  digest_sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.team_notifications
  add column if not exists digest_sent_at timestamptz;

create index if not exists team_notifications_recipient_idx
  on public.team_notifications(recipient_id, created_at desc)
  where read_at is null;

create table if not exists public.team_notification_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  slack_webhook_url text,
  email_digest_enabled boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_permission_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  invite_roles member_role[] not null default array['owner','admin']::member_role[],
  connect_channel_roles member_role[] not null default array['owner','admin']::member_role[],
  assign_roles member_role[] not null default array['owner','admin','member']::member_role[],
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.workspace_permission_allowed(ws_id uuid, permission_key text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    case
      when public.workspace_member_role(ws_id) = 'owner' then true
      when permission_key = 'invite' then public.workspace_member_role(ws_id) = any(
        coalesce(
          (select invite_roles from public.workspace_permission_settings where workspace_id = ws_id),
          array['owner','admin']::member_role[]
        )
      )
      when permission_key = 'connect_channel' then public.workspace_member_role(ws_id) = any(
        coalesce(
          (select connect_channel_roles from public.workspace_permission_settings where workspace_id = ws_id),
          array['owner','admin']::member_role[]
        )
      )
      when permission_key = 'assign' then public.workspace_member_role(ws_id) = any(
        coalesce(
          (select assign_roles from public.workspace_permission_settings where workspace_id = ws_id),
          array['owner','admin','member']::member_role[]
        )
      )
      else false
    end,
    false
  );
$$;

create or replace function public.enforce_conversation_assignment_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.assigned_to is distinct from new.assigned_to then
    if not public.workspace_permission_allowed(new.workspace_id, 'assign') then
      raise exception 'Permission insuffisante pour assigner cette conversation.';
    end if;
    if new.assigned_to is not null and not exists (
      select 1 from public.workspace_members member
      where member.workspace_id = new.workspace_id and member.user_id = new.assigned_to
    ) then
      raise exception 'Le destinataire ne fait pas partie du workspace.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_conversation_assignment_permission on public.conversations;
create trigger enforce_conversation_assignment_permission
  before update of assigned_to on public.conversations
  for each row execute function public.enforce_conversation_assignment_permission();

create or replace function public.enforce_channel_connection_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role'
    and not public.workspace_permission_allowed(new.workspace_id, 'connect_channel') then
    raise exception 'Permission insuffisante pour connecter un canal.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_channel_connection_permission on public.channel_accounts;
create trigger enforce_channel_connection_permission
  before insert or update on public.channel_accounts
  for each row execute function public.enforce_channel_connection_permission();

create or replace function public.enforce_invite_acceptance_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.workspace_permission_allowed(old.workspace_id, 'invite') then
    return new;
  end if;
  if old.workspace_id is distinct from new.workspace_id
    or old.email is distinct from new.email
    or old.role is distinct from new.role
    or old.token_hash is distinct from new.token_hash
    or old.invited_by is distinct from new.invited_by
    or old.expires_at is distinct from new.expires_at
    or old.created_at is distinct from new.created_at
    or new.accepted_by is distinct from auth.uid()
    or new.accepted_at is null then
    raise exception 'Une invitation ne peut être modifiée que pour son acceptation.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_invite_acceptance_integrity on public.workspace_invites;
create trigger enforce_invite_acceptance_integrity
  before update on public.workspace_invites
  for each row execute function public.enforce_invite_acceptance_integrity();

create or replace function public.enforce_notification_read_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt()->>'role', '') = 'service_role' then
    return new;
  end if;
  if old.workspace_id is distinct from new.workspace_id
    or old.recipient_id is distinct from new.recipient_id
    or old.actor_id is distinct from new.actor_id
    or old.conversation_id is distinct from new.conversation_id
    or old.kind is distinct from new.kind
    or old.body is distinct from new.body
    or old.digest_sent_at is distinct from new.digest_sent_at
    or old.created_at is distinct from new.created_at then
    raise exception 'Seule la lecture d''une notification peut être mise à jour.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_notification_read_only on public.team_notifications;
create trigger enforce_notification_read_only
  before update on public.team_notifications
  for each row execute function public.enforce_notification_read_only();

alter table public.workspace_invites enable row level security;
alter table public.conversation_internal_notes enable row level security;
alter table public.conversation_activity_events enable row level security;
alter table public.team_notifications enable row level security;
alter table public.team_notification_settings enable row level security;
alter table public.workspace_permission_settings enable row level security;

drop policy if exists "profiles: workspace teammates can read" on public.profiles;
create policy "profiles: workspace teammates can read"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.workspace_members mine
      join public.workspace_members teammate
        on teammate.workspace_id = mine.workspace_id
      where mine.user_id = auth.uid()
        and teammate.user_id = profiles.id
    )
  );

drop policy if exists "workspace_invites: admins can read" on public.workspace_invites;
create policy "workspace_invites: admins can read"
  on public.workspace_invites for select
  using (public.workspace_permission_allowed(workspace_id, 'invite'));

drop policy if exists "workspace_invites: admins can insert" on public.workspace_invites;
create policy "workspace_invites: admins can insert"
  on public.workspace_invites for insert
  with check (
    public.workspace_permission_allowed(workspace_id, 'invite')
    and role <> 'owner'
  );

drop policy if exists "workspace_invites: admins can update" on public.workspace_invites;
create policy "workspace_invites: admins can update"
  on public.workspace_invites for update
  using (public.workspace_permission_allowed(workspace_id, 'invite'))
  with check (
    public.workspace_permission_allowed(workspace_id, 'invite')
    and role <> 'owner'
  );

drop policy if exists "workspace_invites: admins can delete" on public.workspace_invites;
create policy "workspace_invites: admins can delete"
  on public.workspace_invites for delete
  using (public.workspace_permission_allowed(workspace_id, 'invite'));

drop policy if exists "workspace_invites: recipient can read" on public.workspace_invites;
create policy "workspace_invites: recipient can read"
  on public.workspace_invites for select
  using (
    accepted_at is null
    and expires_at > now()
    and lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  );

drop policy if exists "workspace_invites: recipient can accept" on public.workspace_invites;
create policy "workspace_invites: recipient can accept"
  on public.workspace_invites for update
  using (
    accepted_at is null
    and expires_at > now()
    and lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  )
  with check (
    lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    and role <> 'owner'
    and accepted_by = auth.uid()
  );

drop policy if exists "workspace_members: invited recipient can join" on public.workspace_members;
create policy "workspace_members: invited recipient can join"
  on public.workspace_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.workspace_invites invite
      where invite.workspace_id = workspace_members.workspace_id
        and invite.accepted_at is null
        and invite.expires_at > now()
        and lower(invite.email) = lower(coalesce(auth.jwt()->>'email', ''))
        and workspace_members.role = invite.role
        and workspace_members.role <> 'owner'
    )
  );

drop policy if exists "conversation_internal_notes: members can read" on public.conversation_internal_notes;
create policy "conversation_internal_notes: members can read"
  on public.conversation_internal_notes for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "conversation_internal_notes: members can insert" on public.conversation_internal_notes;
create policy "conversation_internal_notes: members can insert"
  on public.conversation_internal_notes for insert
  with check (
    public.is_workspace_member(workspace_id)
    and author_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.workspace_id = workspace_id
    )
  );

drop policy if exists "conversation_activity_events: members can read" on public.conversation_activity_events;
create policy "conversation_activity_events: members can read"
  on public.conversation_activity_events for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "conversation_activity_events: members can insert" on public.conversation_activity_events;
create policy "conversation_activity_events: members can insert"
  on public.conversation_activity_events for insert
  with check (
    public.is_workspace_member(workspace_id)
    and actor_id = auth.uid()
    and (
      conversation_id is null
      or exists (
        select 1 from public.conversations c
        where c.id = conversation_id and c.workspace_id = workspace_id
      )
    )
  );

drop policy if exists "team_notifications: recipient can read" on public.team_notifications;
create policy "team_notifications: recipient can read"
  on public.team_notifications for select
  using (recipient_id = auth.uid());

drop policy if exists "team_notifications: members can create" on public.team_notifications;
create policy "team_notifications: members can create"
  on public.team_notifications for insert
  with check (
    public.is_workspace_member(workspace_id)
    and actor_id = auth.uid()
    and exists (
      select 1 from public.workspace_members recipient
      where recipient.workspace_id = team_notifications.workspace_id
        and recipient.user_id = team_notifications.recipient_id
    )
    and (
      conversation_id is null
      or exists (
        select 1 from public.conversations c
        where c.id = conversation_id and c.workspace_id = team_notifications.workspace_id
      )
    )
  );

drop policy if exists "team_notifications: recipient can update" on public.team_notifications;
create policy "team_notifications: recipient can update"
  on public.team_notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists "team_notification_settings: members can read" on public.team_notification_settings;
create policy "team_notification_settings: members can read"
  on public.team_notification_settings for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "team_notification_settings: admins can write" on public.team_notification_settings;
create policy "team_notification_settings: admins can write"
  on public.team_notification_settings for all
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

drop policy if exists "workspace_permission_settings: members can read" on public.workspace_permission_settings;
create policy "workspace_permission_settings: members can read"
  on public.workspace_permission_settings for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace_permission_settings: owners can write" on public.workspace_permission_settings;
create policy "workspace_permission_settings: owners can write"
  on public.workspace_permission_settings for all
  using (public.workspace_member_role(workspace_id) = 'owner')
  with check (public.workspace_member_role(workspace_id) = 'owner');

drop policy if exists "email_templates: members can read" on public.email_templates;
drop policy if exists "email_templates: members can insert" on public.email_templates;
drop policy if exists "email_templates: members can update" on public.email_templates;
drop policy if exists "email_templates: members can delete" on public.email_templates;

create policy "email_templates: visible to team or creator"
  on public.email_templates for select
  using (
    public.is_workspace_member(workspace_id)
    and (visibility = 'team' or created_by = auth.uid())
  );

create policy "email_templates: members create"
  on public.email_templates for insert
  with check (
    public.is_workspace_member(workspace_id)
    and created_by = auth.uid()
  );

create policy "email_templates: creators or admins update"
  on public.email_templates for update
  using (
    public.is_workspace_member(workspace_id)
    and (created_by = auth.uid() or public.is_workspace_admin(workspace_id))
  )
  with check (
    public.is_workspace_member(workspace_id)
    and (created_by = auth.uid() or public.is_workspace_admin(workspace_id))
  );

create policy "email_templates: creators or admins delete"
  on public.email_templates for delete
  using (
    public.is_workspace_member(workspace_id)
    and (created_by = auth.uid() or public.is_workspace_admin(workspace_id))
  );

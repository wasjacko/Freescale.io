-- Reusable canned-response bodies the user can insert in the EmailComposer.
-- One row per saved template, scoped to a workspace so teams share them.
-- The body supports the same line breaks as a manually-typed reply; the
-- composer literally concatenates body + signature on insert.

create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_templates enable row level security;

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

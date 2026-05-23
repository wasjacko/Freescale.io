-- Phase 2 billing: Stripe state, trial metadata, and Mue usage counters.

alter table public.profiles
  add column if not exists billing_status text not null default 'trialing',
  add column if not exists stripe_subscription_id text,
  add column if not exists billing_period_end timestamptz,
  add column if not exists trial_reminder_sent_at timestamptz;

alter table public.profiles
  alter column trial_ends_at set default (now() + interval '14 days');

update public.profiles
set trial_ends_at = coalesce(trial_ends_at, created_at + interval '14 days')
where plan = 'free' and trial_ends_at is null;

update public.profiles
set billing_status = case
  when plan <> 'free' then 'active'
  when trial_ends_at > now() then 'trialing'
  else 'trial_expired'
end
where billing_status = 'trialing';

create unique index if not exists profiles_stripe_customer_id_unique
  on public.profiles(stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists profiles_stripe_subscription_id_unique
  on public.profiles(stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  count integer not null default 0 check (count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, user_id, key, period_start)
);

alter table public.usage_counters enable row level security;

create policy "usage_counters: members can read"
  on public.usage_counters for select
  using (public.is_workspace_member(workspace_id));

create policy "usage_counters: members can insert"
  on public.usage_counters for insert
  with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());

create policy "usage_counters: members can update own"
  on public.usage_counters for update
  using (public.is_workspace_member(workspace_id) and user_id = auth.uid());

create or replace function public.increment_usage_counter(
  p_workspace_id uuid,
  p_key text,
  p_limit integer default null
)
returns table(current_count integer, limited boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_period_start timestamptz := date_trunc('month', now());
  v_period_end timestamptz := date_trunc('month', now()) + interval '1 month';
  v_count integer;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'not workspace member';
  end if;

  insert into public.usage_counters (
    workspace_id,
    user_id,
    key,
    period_start,
    period_end,
    count
  )
  values (
    p_workspace_id,
    v_user,
    p_key,
    v_period_start,
    v_period_end,
    0
  )
  on conflict (workspace_id, user_id, key, period_start) do nothing;

  select uc.count
  into v_count
  from public.usage_counters uc
  where uc.workspace_id = p_workspace_id
    and uc.user_id = v_user
    and uc.key = p_key
    and uc.period_start = v_period_start
  for update;

  if p_limit is not null and v_count >= p_limit then
    return query select v_count, true;
    return;
  end if;

  update public.usage_counters uc
  set count = uc.count + 1,
      updated_at = now()
  where uc.workspace_id = p_workspace_id
    and uc.user_id = v_user
    and uc.key = p_key
    and uc.period_start = v_period_start
  returning uc.count into v_count;

  return query select v_count, false;
end;
$$;

grant execute on function public.increment_usage_counter(uuid, text, integer) to authenticated;

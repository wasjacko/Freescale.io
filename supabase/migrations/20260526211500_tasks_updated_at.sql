-- Mobile synchronization requires a mutation cursor, including updates made
-- from the existing web client.
alter table public.tasks
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

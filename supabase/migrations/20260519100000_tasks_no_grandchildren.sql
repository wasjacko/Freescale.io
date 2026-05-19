-- Audit #10 — prevent multi-level subtask nesting.
--
-- 20260518240000 added tasks.parent_task_id as a self-FK, but with no
-- depth check. The UI renders one level only (parent + direct
-- children), so any programmatic insert that creates a grandchild
-- becomes invisible from the app and impossible to clean up without
-- raw SQL.
--
-- This trigger enforces the invariant at the DB layer:
--   - If a row's parent_task_id is set, that parent must itself be
--     top-level (parent_task_id IS NULL).
--   - A task that already has children cannot become a child itself
--     (would orphan its existing children one level deep).
--
-- Both branches raise a clear error rather than failing silently —
-- the API surfaces it back to the caller.

create or replace function public.task_no_grandchildren()
returns trigger
language plpgsql
as $$
begin
  -- Only enforce when parent_task_id is set (top-level inserts pass).
  if NEW.parent_task_id is null then
    return NEW;
  end if;

  -- Parent must itself be top-level.
  if exists (
    select 1 from public.tasks p
    where p.id = NEW.parent_task_id
      and p.parent_task_id is not null
  ) then
    raise exception 'tasks cannot nest more than 1 level deep (parent % already has a parent)', NEW.parent_task_id
      using errcode = 'check_violation';
  end if;

  -- This row, if it already has children, cannot itself become a child.
  if exists (
    select 1 from public.tasks c
    where c.parent_task_id = NEW.id
  ) then
    raise exception 'task % has subtasks and cannot become a subtask itself', NEW.id
      using errcode = 'check_violation';
  end if;

  return NEW;
end;
$$;

drop trigger if exists tasks_no_grandchildren on public.tasks;
create trigger tasks_no_grandchildren
before insert or update on public.tasks
for each row
execute function public.task_no_grandchildren();

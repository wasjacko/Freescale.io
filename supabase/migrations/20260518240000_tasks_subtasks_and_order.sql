-- Subtasks (parent_task_id) + manual reorder (sortable_index).
--
-- parent_task_id : self-FK to tasks. Deleting a parent ALSO deletes its
-- children (on delete cascade) — this matches how trello/things-style apps
-- model it and avoids orphan subtasks. Subtasks are one level deep only;
-- the UI doesn't render grand-children even if the schema allows it.
--
-- sortable_index : real (not integer) so we can insert between two rows
-- by averaging their indexes without rewriting the whole list (LexoRank-lite).
-- Defaults to created_at's epoch milliseconds so existing rows keep insertion
-- order without a manual backfill.

alter table public.tasks
  add column if not exists parent_task_id uuid references public.tasks(id) on delete cascade,
  add column if not exists sortable_index double precision;

-- Backfill: existing rows get their created_at epoch as the index, which
-- preserves insertion order until the user starts dragging.
update public.tasks
   set sortable_index = extract(epoch from coalesce(created_at, now())) * 1000
 where sortable_index is null;

-- Index for the common query: list all tasks (or all top-level tasks) in
-- a workspace ordered by their manual rank.
create index if not exists tasks_workspace_order_idx
  on public.tasks(workspace_id, sortable_index);

create index if not exists tasks_parent_idx
  on public.tasks(parent_task_id)
  where parent_task_id is not null;

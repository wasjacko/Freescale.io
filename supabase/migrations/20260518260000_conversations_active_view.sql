-- View that exposes only the "currently visible" conversations — i.e.
-- those that are NOT snoozed into the future. The previous inbox query
-- built this filter in JS by interpolating new Date().toISOString() into
-- a PostgREST .or() clause, which:
--   - Computed "now" on the Node server rather than in Postgres
--   - Relied on PostgREST's text → timestamptz coercion for the comparison
--   - Forced a stringified value into a URL filter
--
-- Pushing the filter into a view means Postgres evaluates now() at
-- query time with its native timestamptz operators. No JS string
-- interpolation, no possible coercion edge cases.
--
-- security_invoker = on (default in PG15+, declared explicitly for clarity)
-- makes the view inherit the underlying table's RLS policies at the
-- caller's privilege — so workspace isolation continues to work without
-- duplicating policies on the view.

create or replace view public.conversations_active
with (security_invoker = on)
as
select c.*
  from public.conversations c
 where c.snoozed_until is null
    or c.snoozed_until <= now();

grant select on public.conversations_active to authenticated;

comment on view public.conversations_active is
  'Conversations with currently-expired (or never-set) snoozed_until. '
  'Used by the inbox query to keep the snooze comparison server-side, '
  'avoiding ISO-string interpolation in PostgREST filter chains.';

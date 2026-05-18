-- Conversation snooze: hide from the inbox until a chosen moment.
-- `starred` already exists on conversations; just adding `snoozed_until`.
--
-- The inbox query filters out rows where snoozed_until > now(), then
-- the user sees them resurface automatically once the timer expires.
alter table public.conversations
  add column if not exists snoozed_until timestamptz;

-- Index so the inbox query stays fast when ordering by last_message_at
-- and filtering out snoozed rows in one shot.
create index if not exists conversations_snooze_idx
  on public.conversations(workspace_id, snoozed_until)
  where snoozed_until is not null;

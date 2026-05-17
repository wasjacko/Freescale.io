-- Soft profiling answers gathered AFTER first value (inline chips in /app).
-- Audit-driven: capture only what personalises the next experience, not
-- a frontload wizard. All three columns are nullable; the user can
-- dismiss without answering.
alter table public.profiles
  add column if not exists objective text,
  add column if not exists usage_mode text;

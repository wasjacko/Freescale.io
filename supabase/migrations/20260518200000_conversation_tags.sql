-- Per-conversation freeform tags. Lightweight (text[] rather than a
-- separate junction table) because tags are user-defined free-text
-- labels and we only ever read all of them at once for a conv.
-- Filtering across the inbox uses the GIN index for "contains" queries.
alter table public.conversations
  add column if not exists tags text[] not null default '{}'::text[];

create index if not exists conversations_tags_gin
  on public.conversations using gin (tags);

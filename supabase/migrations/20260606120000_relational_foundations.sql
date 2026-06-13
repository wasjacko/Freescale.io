-- Lot 0 — Fondations relationnelles.
-- Objectif : pouvoir trier par URGENCE relationnelle (pas par date), détecter
-- les relances dues, et faire sonner Mue dans le ton/langue de chaque client.

-- 1. Conversations : qui doit une réponse à qui, et depuis quand.
alter table public.conversations
  add column if not exists last_inbound_at timestamptz,
  add column if not exists last_outbound_at timestamptz,
  add column if not exists awaiting_reply boolean not null default false;

comment on column public.conversations.last_inbound_at is 'Dernier message entrant (du client).';
comment on column public.conversations.last_outbound_at is 'Dernier message sortant (de l''utilisateur).';
comment on column public.conversations.awaiting_reply is 'Dérivé : la balle est dans le camp de l''utilisateur (le client attend une réponse).';

create index if not exists conversations_awaiting_reply_idx
  on public.conversations (workspace_id, awaiting_reply)
  where awaiting_reply;

-- 2. Ton + langue préférés PAR CLIENT (brouillons Mue qui sonnent juste).
alter table public.contacts
  add column if not exists preferred_tone text,
  add column if not exists preferred_lang text;

comment on column public.contacts.preferred_tone is 'Ton préféré appris pour ce client (ex. cool, formel, direct).';
comment on column public.contacts.preferred_lang is 'Langue préférée pour ce client (ex. fr, en).';

-- 3. Backfill initial depuis les messages existants.
update public.conversations c
set
  last_inbound_at = sub.last_in,
  last_outbound_at = sub.last_out,
  awaiting_reply = coalesce(sub.last_in > coalesce(sub.last_out, 'epoch'::timestamptz), false)
from (
  select
    conversation_id,
    max(sent_at) filter (where direction = 'in') as last_in,
    max(sent_at) filter (where direction = 'out') as last_out
  from public.messages
  group by conversation_id
) sub
where sub.conversation_id = c.id;

-- NOTE (Lot 3) : `conversations.assigned_to` et la couche équipe (assignation,
-- notes internes, membres) seront retirés quand on coupera la collaboration
-- (ICP = freelance SOLO). Volontairement hors de cette migration.

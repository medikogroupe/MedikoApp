-- MEDIKO+ : suivis de simulation enregistres par etudiant (reprise d'une session a l'autre).
create table if not exists public.jeu_suivis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  cas_slug text not null,
  etat jsonb not null,
  statut text not null default 'EN_COURS' check (statut in ('EN_COURS', 'TERMINE')),
  issue text,
  jour integer not null default 0,
  consultations integer not null default 1,
  bilan jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jeu_suivis_user_idx on public.jeu_suivis (user_id, statut, updated_at desc);
alter table public.jeu_suivis enable row level security;
-- MEDIKO+ : cas cliniques du jeu Parcours patient (actifs ou non, geres par l'admin).
create table if not exists public.jeu_cas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titre text not null,
  gravite text not null default 'MODERE' check (gravite in ('LEGER', 'MODERE', 'GRAVE', 'CRITIQUE')),
  patient text not null default '',
  duree text not null default '',
  icone text not null default 'stetho',
  resume text not null default '',
  contenu jsonb not null default '{}'::jsonb,
  statut text not null default 'BROUILLON' check (statut in ('BROUILLON', 'ACTIF')),
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists jeu_cas_statut_idx on public.jeu_cas (statut, ordre);
alter table public.jeu_cas enable row level security;
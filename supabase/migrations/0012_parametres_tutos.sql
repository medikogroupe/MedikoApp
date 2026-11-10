-- MEDIKO+ : paramètres modifiables par l'admin et liens du tuto médical.
create table if not exists public.parametres (
  cle text primary key,
  valeur text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.tutos (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  lien text not null,
  description text not null default '',
  ordre integer not null default 0,
  est_actif boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.parametres enable row level security;
alter table public.tutos enable row level security;
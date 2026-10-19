-- MEDIKO+ : schéma complet (PostgreSQL / Supabase)
-- Exécuter dans l'éditeur SQL Supabase ou via `psql -f`.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  nom_whatsapp text not null,
  numero_whatsapp text not null unique,
  password_hash text not null,
  filiere text not null default 'autre',
  ville text not null default 'Abidjan',
  projet_carriere text default '',
  pack text not null default 'FREE',
  statut text not null default 'ACTIF',
  created_at timestamptz not null default now()
);

create table if not exists public.edt_perso (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  titre text not null,
  lieu text default '',
  date date not null,
  heure_debut time not null,
  heure_fin time not null,
  type text not null default 'cours',
  created_at timestamptz not null default now()
);

create table if not exists public.notes_perso (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  matiere text not null,
  note double precision not null,
  coef integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.carriere (
  user_id uuid primary key references public.users(id) on delete cascade,
  objectif text default '',
  specialite text default '',
  bourse_montant integer default 0,
  depenses_json jsonb default '[]'::jsonb,
  epargne integer default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.bibliotheque_perso (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  nom_fichier text not null,
  url_storage text not null,
  dossier text not null default 'Général',
  taille integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.fichiers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  mime text not null default 'application/pdf',
  contenu text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.qcm (
  id uuid primary key default gen_random_uuid(),
  matiere text not null,
  question text not null,
  propositions jsonb not null,
  bonne_reponse text not null,
  explication text not null default '',
  niveau text not null default 'L1',
  created_at timestamptz not null default now()
);

create table if not exists public.qcm_admin (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  module text not null,
  duree_minutes integer not null default 30,
  nb_questions integer not null default 20,
  date_lancement timestamptz not null default now(),
  statut text not null default 'PROGRAMME',
  created_at timestamptz not null default now()
);

create table if not exists public.resultats_qcm (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  qcm_admin_id uuid references public.qcm_admin(id) on delete set null,
  matiere text default '',
  score integer not null default 0,
  total integer not null default 0,
  temps integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  type text not null default 'pharmacie'
    check (type in ('pharmacie','centre_sante','chu','clinique')),
  ville text not null default 'Abidjan',
  commune text not null default '',
  quartier text default '',
  adresse text default '',
  telephone text default '',
  whatsapp text default '',
  latitude double precision not null default 5.32,
  longitude double precision not null default -4.02,
  horaires text default '08h - 20h',
  jours_garde date[] default '{}',
  est_de_garde_aujourdhui boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.packs_config (
  id uuid primary key default gen_random_uuid(),
  nom_pack text not null,
  prix_fcfa integer not null default 0,
  duree_jours integer not null default 30,
  lien_paiement text not null default '',
  description text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.uploads_communaute (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  fichier_url text default '',
  titre text not null,
  matiere text default '',
  description text default '',
  statut text not null default 'EN_ATTENTE',
  created_at timestamptz not null default now()
);

create table if not exists public.paiements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  pack text not null,
  montant integer not null default 0,
  statut text not null default 'VALIDE',
  created_at timestamptz not null default now()
);

-- Données initiales : packs
insert into public.packs_config (nom_pack, prix_fcfa, duree_jours, lien_paiement, description)
select 'MENSUEL', 500, 30, 'https://pay.wave.com/m/medikoplus/c/ci/', 'Accès complet pendant 30 jours.'
where not exists (select 1 from public.packs_config where nom_pack = 'MENSUEL');

insert into public.packs_config (nom_pack, prix_fcfa, duree_jours, lien_paiement, description)
select 'A_VIE', 4900, 9999, 'https://pay.wave.com/m/medikoplus/c/ci/', 'Accès à vie à toutes les fonctionnalités.'
where not exists (select 1 from public.packs_config where nom_pack = 'A_VIE');

-- Mise à jour quotidienne des gardes
create or replace function public.actualiser_gardes() returns void language sql as $$
  update public.pharmacies
  set est_de_garde_aujourdhui = coalesce(current_date = any(jours_garde), false);
$$;

-- ============================================================
-- RLS : données personnelles privées (user_id = auth.uid())
-- ============================================================
alter table public.edt_perso enable row level security;
alter table public.notes_perso enable row level security;
alter table public.carriere enable row level security;
alter table public.bibliotheque_perso enable row level security;
alter table public.fichiers enable row level security;
alter table public.resultats_qcm enable row level security;
alter table public.uploads_communaute enable row level security;
alter table public.paiements enable row level security;
alter table public.pharmacies enable row level security;
alter table public.qcm enable row level security;
alter table public.qcm_admin enable row level security;
alter table public.packs_config enable row level security;

drop policy if exists "edt_perso_owner" on public.edt_perso;
create policy "edt_perso_owner" on public.edt_perso
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notes_perso_owner" on public.notes_perso;
create policy "notes_perso_owner" on public.notes_perso
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "carriere_owner" on public.carriere;
create policy "carriere_owner" on public.carriere
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "bibliotheque_owner" on public.bibliotheque_perso;
create policy "bibliotheque_owner" on public.bibliotheque_perso
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "fichiers_owner" on public.fichiers;
create policy "fichiers_owner" on public.fichiers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "resultats_owner" on public.resultats_qcm;
create policy "resultats_owner" on public.resultats_qcm
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "paiements_owner" on public.paiements;
create policy "paiements_owner" on public.paiements
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "uploads_owner_write" on public.uploads_communaute;
create policy "uploads_owner_write" on public.uploads_communaute
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "uploads_public_read_valide" on public.uploads_communaute;
create policy "uploads_public_read_valide" on public.uploads_communaute
  for select using (statut = 'VALIDE');

-- Lecture publique : annuaire santé, banque de QCM, sessions et packs
drop policy if exists "pharmacies_public_read" on public.pharmacies;
create policy "pharmacies_public_read" on public.pharmacies for select using (true);

drop policy if exists "qcm_public_read" on public.qcm;
create policy "qcm_public_read" on public.qcm for select using (true);

drop policy if exists "qcm_admin_public_read" on public.qcm_admin;
create policy "qcm_admin_public_read" on public.qcm_admin for select using (true);

drop policy if exists "packs_public_read" on public.packs_config;
create policy "packs_public_read" on public.packs_config for select using (true);

-- Les écritures sur pharmacies / qcm / packs se font avec la clé service_role
-- (console /admin protégée par ADMIN_PASSWORD), qui contourne la RLS.

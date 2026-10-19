-- MEDIKO+ : banque de questions avancee (QCU/QCD/QCM), notation par question,
-- images, filieres par session, tentatives corrigees cote serveur.
-- Idempotent : rejouable sans risque. Ne supprime aucune donnee.

alter table public.qcm add column if not exists type text not null default 'QCU';
alter table public.qcm add column if not exists bonnes jsonb not null default '[]'::jsonb;
alter table public.qcm add column if not exists points double precision not null default 1;
alter table public.qcm add column if not exists penalite double precision not null default 0;
alter table public.qcm add column if not exists mode text not null default 'TOUT_OU_RIEN';
alter table public.qcm add column if not exists image_id uuid;
alter table public.qcm add column if not exists propositions_images jsonb not null default '[]'::jsonb;
alter table public.qcm add column if not exists actif boolean not null default true;

alter table public.qcm_admin add column if not exists filieres jsonb not null default '[]'::jsonb;
alter table public.qcm_admin add column if not exists question_ids jsonb not null default '[]'::jsonb;
alter table public.qcm_admin add column if not exists sorties_max integer not null default 0;
alter table public.qcm_admin add column if not exists melanger boolean not null default true;

create table if not exists public.qcm_images (
  id uuid primary key default gen_random_uuid(),
  mime text not null,
  contenu text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.qcm_tentatives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  qcm_admin_id uuid,
  titre text not null default '',
  matiere text not null default '',
  question_ids jsonb not null default '[]'::jsonb,
  reponses jsonb not null default '{}'::jsonb,
  statut text not null default 'EN_COURS',
  points double precision not null default 0,
  points_max double precision not null default 0,
  note_sur_20 double precision not null default 0,
  nb_justes integer not null default 0,
  sorties integer not null default 0,
  surveille boolean not null default false,
  debut_at timestamptz not null default now(),
  limite_at timestamptz not null default now(),
  fin_at timestamptz
);

create index if not exists qcm_tentatives_user_idx on public.qcm_tentatives (user_id, statut);
create index if not exists qcm_tentatives_session_idx on public.qcm_tentatives (qcm_admin_id);

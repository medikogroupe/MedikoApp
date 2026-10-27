-- MEDIKO+ : cours de Licence 1 (Infirmiers / Sages-femmes), regroupés par domaines.
-- Idempotent : peut être rejoué sans risque. Ne supprime aucune donnée.

create table if not exists public.domaines (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nom text not null,
  description text not null default '',
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.matieres (
  id uuid primary key default gen_random_uuid(),
  domaine_id uuid not null references public.domaines(id) on delete cascade,
  slug text not null unique,
  code_officiel text not null default '',
  nom text not null,
  semestre smallint not null check (semestre in (1, 2)),
  ordre integer not null default 0,
  est_actif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Un cours par matière
create table if not exists public.cours (
  id uuid primary key default gen_random_uuid(),
  matiere_id uuid not null unique references public.matieres(id) on delete cascade,
  definition text not null default '',
  objectifs jsonb not null default '[]'::jsonb,   -- ["...", "..."]
  sections jsonb not null default '[]'::jsonb,    -- [{ "titre": "", "texte": "", "points": [] }]
  resume jsonb not null default '[]'::jsonb,      -- ["...", "..."]
  statut text not null default 'BROUILLON' check (statut in ('BROUILLON', 'PUBLIE')),
  updated_at timestamptz not null default now()
);

-- 10 QCM par matière
create table if not exists public.qcm_cours (
  id uuid primary key default gen_random_uuid(),
  matiere_id uuid not null references public.matieres(id) on delete cascade,
  ordre integer not null default 0,
  question text not null,
  options jsonb not null,                 -- ["A", "B", "C", "D"]
  bonne_reponse smallint not null,        -- position de la bonne réponse, à partir de 0
  explication text not null default '',
  created_at timestamptz not null default now()
);

-- Un cas clinique corrigé par matière
create table if not exists public.cas_cliniques (
  id uuid primary key default gen_random_uuid(),
  matiere_id uuid not null unique references public.matieres(id) on delete cascade,
  titre text not null,
  enonce text not null,
  questions jsonb not null default '[]'::jsonb,   -- [{ "question": "", "correction": "" }]
  created_at timestamptz not null default now()
);

-- Progression de chaque étudiant
create table if not exists public.progressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  matiere_id uuid not null references public.matieres(id) on delete cascade,
  cours_lu boolean not null default false,
  dernier_score smallint,
  meilleur_score smallint,
  nb_tentatives integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, matiere_id)
);

create index if not exists matieres_domaine_idx on public.matieres (domaine_id, ordre);
create index if not exists qcm_cours_matiere_idx on public.qcm_cours (matiere_id, ordre);
create index if not exists progressions_user_idx on public.progressions (user_id);

-- Accès public fermé : l'app passe par la connexion serveur, pas par l'API publique.
alter table public.domaines enable row level security;
alter table public.matieres enable row level security;
alter table public.cours enable row level security;
alter table public.qcm_cours enable row level security;
alter table public.cas_cliniques enable row level security;
alter table public.progressions enable row level security;

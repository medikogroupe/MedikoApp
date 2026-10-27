-- MEDIKO+ : PDF de cours déposés par l'admin, rattachés à une matière.
create table if not exists public.pdf_cours (
  id uuid primary key default gen_random_uuid(),
  matiere_id uuid references public.matieres(id) on delete set null,
  titre text not null,
  nom_fichier text not null,
  taille integer not null default 0,
  contenu text not null,
  est_actif boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists pdf_cours_matiere_idx on public.pdf_cours (matiere_id);
alter table public.pdf_cours enable row level security;
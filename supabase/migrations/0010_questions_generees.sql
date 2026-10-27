-- MEDIKO+ : questions générées à partir des PDF, relues par l'admin.
create table if not exists public.questions_generees (
  id uuid primary key default gen_random_uuid(),
  matiere_id uuid not null references public.matieres(id) on delete cascade,
  pdf_id uuid references public.pdf_cours(id) on delete set null,
  type text not null check (type in ('QCM', 'QCD', 'CAS')),
  contexte text not null default '',
  question text not null,
  options jsonb not null default '[]'::jsonb,
  bonnes_reponses jsonb not null default '[]'::jsonb,
  explication text not null default '',
  statut text not null default 'BROUILLON' check (statut in ('BROUILLON', 'VALIDE', 'REJETE')),
  created_at timestamptz not null default now()
);

create index if not exists questions_generees_tirage_idx
  on public.questions_generees (matiere_id, statut, type);
alter table public.questions_generees enable row level security;
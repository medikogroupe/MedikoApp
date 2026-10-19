alter table qcm_admin add column if not exists sections jsonb not null default '[]'::jsonb;
alter table qcm_admin add column if not exists fige_at timestamptz;
alter table qcm_admin add column if not exists snapshot jsonb not null default '{}'::jsonb;
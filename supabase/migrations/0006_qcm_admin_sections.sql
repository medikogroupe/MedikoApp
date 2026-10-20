alter table qcm_admin add column if not exists sections jsonb not null default '[]'::jsonb;

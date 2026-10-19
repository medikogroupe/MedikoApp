alter table qcm add column if not exists obligatoire boolean not null default false;
alter table qcm_admin add column if not exists consignes text not null default '';
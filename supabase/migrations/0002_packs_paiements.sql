-- MEDIKO+ : packs configurables, expiration des abonnements, paiements fiables.
-- Idempotent : peut etre rejoue sans risque. Ne supprime aucune donnee.

alter table public.packs_config add column if not exists est_actif boolean not null default true;
alter table public.packs_config add column if not exists note_admin text not null default '';
alter table public.packs_config add column if not exists ordre integer not null default 0;

alter table public.users add column if not exists pack_expire_at timestamptz;
alter table public.paiements add column if not exists pack_id uuid;

-- Renommage des 2 packs par defaut (seulement s'ils portent encore l'ancien nom)
update public.packs_config set nom_pack = 'Mensuel 500F', ordre = 1 where nom_pack = 'MENSUEL';
update public.packs_config set nom_pack = 'A vie 4900F', ordre = 2 where nom_pack = 'A_VIE';

-- Retire le faux lien Wave de demonstration (a remplacer depuis /admin)
update public.packs_config
set lien_paiement = ''
where lien_paiement = 'https://pay.wave.com/m/medikoplus/c/ci/';

-- Note admin par defaut
update public.packs_config
set note_admin = 'Après paiement Wave, activez manuellement le compte dans Gestion Comptes'
where note_admin = '';

create index if not exists paiements_user_statut_idx on public.paiements (user_id, statut);

-- MEDIKO+ : types de questions QCU, QCM, QCD (vrai ou faux) et CAS.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'questions_generees_type_check'
      and pg_get_constraintdef(oid) not like '%QCU%'
  ) then
    alter table public.questions_generees drop constraint questions_generees_type_check;
    update public.questions_generees
      set type = case type when 'QCM' then 'QCU' when 'QCD' then 'QCM' else type end
      where type in ('QCM', 'QCD');
    alter table public.questions_generees
      add constraint questions_generees_type_check check (type in ('QCU', 'QCM', 'QCD', 'CAS'));
  end if;
end $$;
-- Removes the 'S' teleprompter text size. At arm's length a 16px line isn't readable
-- while speaking, so Medium becomes the smallest option.
--
-- Order matters: existing rows are migrated up to 'M' BEFORE the constraint is
-- retightened, otherwise adding the narrower check fails on any row still holding 'S'.
update public.profiles
set teleprompter_text_size = 'M'
where teleprompter_text_size = 'S';

-- 0001 declared this as an inline, unnamed CHECK, so Postgres auto-named it. Look it
-- up by the column it constrains rather than hardcoding a name: 0001 used
-- `add column if not exists`, so on a database where the column already existed the
-- constraint may never have been created at all.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'profiles'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%teleprompter_text_size%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_teleprompter_text_size_check
  check (teleprompter_text_size in ('M', 'L', 'XL'));

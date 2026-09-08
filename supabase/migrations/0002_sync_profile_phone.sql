-- The pre-existing `handle_new_user()` trigger (owned by another app sharing
-- this `profiles` table) only inserts id/email/name/image — it has no idea
-- ScripAI added a `phone` column, so phone-based signups left it null even
-- though `auth.users.phone` was set correctly.
--
-- We do NOT touch `handle_new_user`/`on_auth_user_created` (the other app's
-- signup flow). Instead we add a second, independent AFTER trigger that only
-- UPDATEs profiles.phone — named to sort alphabetically after
-- "on_auth_user_created" so it always runs once that trigger's INSERT has
-- already created the row (Postgres fires same-event triggers in trigger-name
-- order). It's a plain UPDATE (never INSERT), so it's a safe no-op if the row
-- doesn't exist yet, and also keeps phone in sync on later phone changes
-- (e.g. Settings' change-phone flow, which calls auth.updateUser({phone})).

create or replace function public.scripai_sync_profile_phone()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles set phone = new.phone where id = new.id;
  return new;
end;
$$;

drop trigger if exists zz_scripai_sync_phone_trigger on auth.users;
create trigger zz_scripai_sync_phone_trigger
  after insert or update of phone on auth.users
  for each row execute function public.scripai_sync_profile_phone();

-- Backfill any rows already affected by this gap (safe: profiles.phone stays
-- null for anyone whose auth.users.phone is also null).
update public.profiles p
set phone = u.phone
from auth.users u
where p.id = u.id and u.phone is not null and p.phone is distinct from u.phone;

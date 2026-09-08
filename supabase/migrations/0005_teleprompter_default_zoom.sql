-- Adds the "Default zoom" teleprompter preference (screens-spec 1mf's third control,
-- which replaced the earlier opacity slider).
--
-- Stored as the 0..1 fraction expo-camera's `zoom` prop takes directly, so the record
-- screen can seed its zoom state from this with no conversion. The design shows the
-- value as a percentage; that formatting is the UI's job, not the column's.
--
-- Follows 0001's pattern: added to the shared `public.profiles` table as a defaulted
-- column, so the other app's pre-existing `handle_new_user` INSERT keeps working
-- untouched. 0 = no zoom, matching the record screen's previous hardcoded start.
alter table public.profiles
  add column if not exists teleprompter_zoom real not null default 0
    check (teleprompter_zoom >= 0 and teleprompter_zoom <= 1);

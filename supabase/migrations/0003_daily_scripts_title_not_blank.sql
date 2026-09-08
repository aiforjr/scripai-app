-- Every script must carry a real, human-readable title — the home screen's task
-- card renders `topic_title` as its headline, so a blank one shows an empty card.
--
-- `topic_title text not null` (0001_init.sql) already rejects NULL, but an empty
-- or whitespace-only string passes that check happily. This adds the missing half
-- so a titleless script can't be written at all, regardless of which code path
-- (edge function, SQL, a future admin tool) does the insert.

-- Backfill any existing blank titles before the constraint is validated, using
-- the linked topic's title where there is one. `topic_id` is nullable and topics
-- can be deleted, so fall back to a generic prompt rather than leaving a row
-- that would fail the new check.
update public.daily_scripts ds
set topic_title = coalesce(
  nullif(btrim(t.title), ''),
  'Talk about your day.'
)
from public.topics t
where ds.topic_id = t.id
  and btrim(coalesce(ds.topic_title, '')) = '';

update public.daily_scripts
set topic_title = 'Talk about your day.'
where btrim(coalesce(topic_title, '')) = '';

alter table public.daily_scripts
  drop constraint if exists daily_scripts_topic_title_not_blank;

alter table public.daily_scripts
  add constraint daily_scripts_topic_title_not_blank
  check (btrim(topic_title) <> '');

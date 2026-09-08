-- ScripAI schema, adapted to coexist with a pre-existing `public.profiles` table
-- from another app already in this project (id, name, email, image, customer_id,
-- price_id, has_access, created_at, updated_at — with its own `handle_new_user`
-- signup trigger and RLS policies already in place). We do NOT touch those
-- columns, the trigger, or the existing policies — we only ADD the columns
-- ScripAI needs (all nullable or defaulted, so the existing signup trigger's
-- INSERT keeps working untouched) and create ScripAI's own tables alongside it.
--
-- NOTE: ScripAI code reads/writes the existing `name` column for display name
-- (not a separate `full_name`), and leaves `customer_id` / `price_id` /
-- `has_access` alone — those belong to the other app sharing this table.

-- ── extend profiles with ScripAI's own columns ─────────────────────────────
alter table public.profiles
  add column if not exists phone text,
  add column if not exists age_bracket text check (age_bracket in ('18-24', '25-34', '35-44', '45-54', '55+')),
  add column if not exists gender text check (gender in ('female', 'male', 'other', 'prefer_not_to_say')),
  add column if not exists camera_fear_situation text,
  add column if not exists topic_preferences text[] not null default '{}',
  add column if not exists reminder_time time not null default '20:00',
  add column if not exists reminder_days int[] not null default '{1,2,3,4,5}', -- 0=Sun..6=Sat, default Mon-Fri
  add column if not exists notifications_enabled boolean not null default true,
  add column if not exists ai_call_enabled boolean not null default false,
  add column if not exists teleprompter_speed text not null default 'medium' check (teleprompter_speed in ('slow', 'medium', 'fast')),
  add column if not exists teleprompter_text_size text not null default 'L' check (teleprompter_text_size in ('S', 'M', 'L', 'XL')),
  add column if not exists save_to_photos boolean not null default false,
  add column if not exists onboarding_complete boolean not null default false,
  add column if not exists is_premium boolean not null default false,
  add column if not exists current_streak int not null default 0,
  add column if not exists longest_streak int not null default 0,
  add column if not exists points int not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_phone_key'
  ) then
    alter table public.profiles add constraint profiles_phone_key unique (phone);
  end if;
end $$;

-- profiles already has RLS enabled with read/insert/update/delete-own-row
-- policies and an `updated_at` touch trigger from the other app — both already
-- satisfy ScripAI's needs (auth.uid() = id), so nothing to add there.

-- ── topics ──────────────────────────────────────────────────────────────────
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  active boolean not null default true
);

insert into public.topics (title, category)
select * from (values
  ('Explain your job to a curious ten-year-old.', 'Work & career'),
  ('Describe a decision you''re proud of and why it worked out.', 'Opinions'),
  ('Pitch an idea you''ve never told anyone about.', 'Startup'),
  ('Talk about a habit that changed your life.', 'Health'),
  ('Describe your favourite place and why it matters to you.', 'Travel'),
  ('Tell a story about a time you failed and what you learned.', 'Storytelling'),
  ('Explain something you understand well to a total beginner.', 'Teaching'),
  ('Talk about how you think about money.', 'Money'),
  ('Describe your family in a way a stranger would understand.', 'Family'),
  ('What would you tell your younger self?', 'Opinions')
) as v(title, category)
where not exists (select 1 from public.topics);

-- ── daily_scripts ───────────────────────────────────────────────────────────
create table if not exists public.daily_scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  topic_id uuid references public.topics (id),
  topic_title text not null,
  script_text text not null,
  model text not null default 'openai/gpt-4o-mini',
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

create index if not exists idx_daily_scripts_user_day on public.daily_scripts (user_id, day);

-- ── recordings ──────────────────────────────────────────────────────────────
create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  daily_script_id uuid not null references public.daily_scripts (id) on delete cascade,
  day date not null,
  storage_path text not null,
  duration_seconds numeric,
  reviewed_audio boolean not null default false,
  reviewed_video boolean not null default false,
  reviewed_both boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

create index if not exists idx_recordings_user_day on public.recordings (user_id, day);

-- ── day_completions ─────────────────────────────────────────────────────────
create table if not exists public.day_completions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  recording_id uuid references public.recordings (id) on delete set null,
  completed_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index if not exists idx_day_completions_user_day on public.day_completions (user_id, day);

-- ── leaderboard view ────────────────────────────────────────────────────────
drop view if exists public.leaderboard;
create view public.leaderboard as
select
  p.id as user_id,
  p.name as full_name,
  p.current_streak,
  p.longest_streak,
  p.points,
  rank() over (order by p.points desc, p.current_streak desc) as rank
from public.profiles p
where p.onboarding_complete = true;

-- ── fn_complete_day: atomic streak/points update, called via RPC ──────────────
create or replace function public.fn_complete_day(p_user_id uuid, p_day date, p_recording_id uuid)
returns table (current_streak int, longest_streak int, points int)
language plpgsql security definer set search_path = public as $$
declare
  v_had_prev_day boolean;
  v_new_streak int;
  v_new_longest int;
  v_new_points int;
begin
  insert into public.day_completions (user_id, day, recording_id)
  values (p_user_id, p_day, p_recording_id)
  on conflict (user_id, day) do update set recording_id = excluded.recording_id;

  update public.recordings
  set completed_at = now()
  where id = p_recording_id and user_id = p_user_id;

  select exists (
    select 1 from public.day_completions
    where user_id = p_user_id and day = p_day - interval '1 day'
  ) into v_had_prev_day;

  select
    case when v_had_prev_day then p.current_streak + 1 else 1 end,
    p.points + 10
  into v_new_streak, v_new_points
  from public.profiles p where p.id = p_user_id;

  select greatest(v_new_streak, p.longest_streak) into v_new_longest
  from public.profiles p where p.id = p_user_id;

  update public.profiles
  set current_streak = v_new_streak, longest_streak = v_new_longest, points = v_new_points
  where id = p_user_id;

  return query select v_new_streak, v_new_longest, v_new_points;
end;
$$;

grant execute on function public.fn_complete_day(uuid, date, uuid) to authenticated;

-- ── RLS on ScripAI's own new tables ─────────────────────────────────────────
alter table public.topics enable row level security;
alter table public.daily_scripts enable row level security;
alter table public.recordings enable row level security;
alter table public.day_completions enable row level security;

drop policy if exists "topics readable by authenticated" on public.topics;
create policy "topics readable by authenticated" on public.topics for select using (auth.role() = 'authenticated');

drop policy if exists "own scripts" on public.daily_scripts;
create policy "own scripts" on public.daily_scripts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own recordings" on public.recordings;
create policy "own recordings" on public.recordings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own completions read" on public.day_completions;
create policy "own completions read" on public.day_completions for select
  using (auth.uid() = user_id);
-- No insert/update/delete policy granted here: writes only happen through the
-- SECURITY DEFINER fn_complete_day RPC above.

grant select on public.leaderboard to authenticated;

-- ── Storage: recordings bucket ──────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false)
on conflict (id) do nothing;

drop policy if exists "user reads own recordings" on storage.objects;
create policy "user reads own recordings"
on storage.objects for select
using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "user uploads own recordings" on storage.objects;
create policy "user uploads own recordings"
on storage.objects for insert
with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "user updates own recordings" on storage.objects;
create policy "user updates own recordings"
on storage.objects for update
using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text);

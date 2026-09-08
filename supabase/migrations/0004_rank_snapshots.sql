-- Rank history, so "Your standing" can show a real rank delta.
--
-- The standing screen's header reads "#5 of 212 · up 2 this week". Rank and
-- total already come from the `leaderboard` view, but the movement half was
-- hardcoded copy: nothing stored yesterday's rank, so no delta could be
-- computed. This adds the missing history.
--
-- Design notes:
--  * A snapshot table rather than a `previous_rank` column on profiles. Rank is
--    a property of the whole board at a moment in time, not of one user, and a
--    single column can only ever answer "since last write" — which drifts as
--    soon as writes aren't exactly weekly. A dated table answers "since any
--    date" and keeps `profiles` (shared with another app) untouched.
--  * `points` and `current_streak` are snapshotted alongside `rank` so a delta
--    can be explained ("up 2 because you logged 5 days"), and so the series
--    survives a future change to how rank is computed.

create table if not exists public.rank_snapshots (
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Local-day key, matching every other date in this schema (see dates.ts).
  day date not null,
  rank int not null,
  board_size int not null,
  points int not null,
  current_streak int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- The standing screen's only query shape: this user's snapshots, newest first.
create index if not exists idx_rank_snapshots_user_day
  on public.rank_snapshots (user_id, day desc);

alter table public.rank_snapshots enable row level security;

drop policy if exists "own snapshots read" on public.rank_snapshots;
create policy "own snapshots read" on public.rank_snapshots for select
  using (auth.uid() = user_id);

-- No insert/update/delete policy: like `day_completions`, writes go only
-- through the SECURITY DEFINER function below. A client that could write its
-- own rank history could fake its movement.

-- ── fn_snapshot_rank: record today's board position for one user ─────────────
-- Idempotent per (user, day): safe to call on every visit to the leaderboard,
-- which is what the client does — there's no scheduler in this project, so the
-- series is built from organic visits rather than a cron job.
create or replace function public.fn_snapshot_rank(p_user_id uuid, p_day date)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_rank int;
  v_board_size int;
  v_points int;
  v_streak int;
begin
  -- Only ever snapshot the caller's own row, even though this runs as definer.
  if p_user_id is distinct from auth.uid() then
    raise exception 'fn_snapshot_rank: can only snapshot your own rank';
  end if;

  select l.rank, l.points, l.current_streak
    into v_rank, v_points, v_streak
  from public.leaderboard l
  where l.user_id = p_user_id;

  -- Not on the board yet (onboarding incomplete): nothing to record.
  if v_rank is null then
    return;
  end if;

  select count(*) into v_board_size from public.leaderboard;

  insert into public.rank_snapshots (user_id, day, rank, board_size, points, current_streak)
  values (p_user_id, p_day, v_rank, v_board_size, v_points, v_streak)
  on conflict (user_id, day) do update
    set rank = excluded.rank,
        board_size = excluded.board_size,
        points = excluded.points,
        current_streak = excluded.current_streak;
end $$;

revoke all on function public.fn_snapshot_rank(uuid, date) from public;
grant execute on function public.fn_snapshot_rank(uuid, date) to authenticated;

-- ── fn_rank_movement: rank change over a trailing window ────────────────────
-- Returns the movement for one user across `p_days` (7 for "this week").
-- `delta` is positive for *improvement* — rank 7 → 5 is "up 2" — because rank
-- numbers fall as you climb, and every caller wants the human-facing sign.
--
-- Returns no row when there's no baseline yet (a new user's first week), which
-- is how the client knows to omit the movement clause entirely rather than
-- claiming "up 0".
create or replace function public.fn_rank_movement(p_user_id uuid, p_days int default 7)
returns table (current_rank int, previous_rank int, delta int, board_size int)
language sql security definer set search_path = public as $$
  with latest as (
    select rank, board_size, day
    from public.rank_snapshots
    where user_id = p_user_id and user_id = auth.uid()
    order by day desc
    limit 1
  ),
  baseline as (
    select s.rank
    from public.rank_snapshots s, latest
    where s.user_id = p_user_id
      and s.user_id = auth.uid()
      and s.day <= latest.day - p_days
    order by s.day desc
    limit 1
  )
  select
    latest.rank,
    baseline.rank,
    baseline.rank - latest.rank,  -- positive == climbed
    latest.board_size
  from latest, baseline;
$$;

revoke all on function public.fn_rank_movement(uuid, int) from public;
grant execute on function public.fn_rank_movement(uuid, int) to authenticated;

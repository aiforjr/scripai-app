import { useEffect, useState } from 'react';

import { dayKey } from '@/src/lib/dates';
import { supabase } from '@/src/lib/supabase';
import type { RankMovement } from '@/src/types/database.types';

/**
 * The user's rank movement over the trailing week, for the standing screen's
 * "#5 of 212 · up 2 this week" line.
 *
 * Records today's position first, then reads the delta. There's no scheduler in
 * this project, so the snapshot series is built from organic visits to this
 * screen — which means a delta only appears once the user has visited at least
 * `days` apart. `movement` stays null until then, and the caller omits the
 * movement clause rather than showing "up 0".
 */
export function useRankMovement(userId: string | undefined, days = 7) {
  const [movement, setMovement] = useState<RankMovement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setMovement(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      // Stamp today's rank before reading, so a first-ever visit still leaves a
      // baseline for next week even though it can't show a delta yet.
      await supabase.rpc('fn_snapshot_rank', { p_user_id: userId, p_day: dayKey() });

      const { data, error } = await supabase.rpc('fn_rank_movement', {
        p_user_id: userId,
        p_days: days,
      });

      if (!mounted) return;
      // No baseline yet returns zero rows, not an error.
      const row = Array.isArray(data) ? data[0] : null;
      setMovement(error || !row ? null : (row as RankMovement));
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [userId, days]);

  return { movement, loading };
}

/** "up 2 this week" / "down 1 this week" / null when flat or unknown. */
export function describeMovement(movement: RankMovement | null): string | null {
  if (!movement || movement.delta === 0) return null;
  const direction = movement.delta > 0 ? 'up' : 'down';
  return `${direction} ${Math.abs(movement.delta)} this week`;
}

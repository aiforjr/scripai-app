import { useEffect, useState } from 'react';

import { dayKey } from '@/src/lib/dates';
import { supabase } from '@/src/lib/supabase';

/**
 * How many days the signed-in user has completed in the current calendar month.
 *
 * This is the real source for the leaderboard's "This month" figure. It counts
 * `day_completions` rows rather than reading a column, because nothing stores a
 * per-month total — `profiles.points` is lifetime-only.
 *
 * Scoped to the current user by design: RLS on `day_completions` only exposes
 * `auth.uid() = user_id`, so a month total genuinely cannot be read for anyone
 * else from the client. Other rows on the board are placeholders.
 */
export function useMonthDayCount(userId: string | undefined) {
  const [monthDays, setMonthDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setMonthDays(0);
      setLoading(false);
      return;
    }

    let mounted = true;
    const now = new Date();
    // Local-timezone month bounds, to stay consistent with `dayKey()` — the day
    // key every other query in the app is keyed on.
    const monthStart = dayKey(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = dayKey(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    supabase
      .from('day_completions')
      .select('day', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('day', monthStart)
      .lte('day', monthEnd)
      .then(({ count, error }) => {
        if (!mounted) return;
        setMonthDays(error ? 0 : (count ?? 0));
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [userId]);

  return { monthDays, loading };
}

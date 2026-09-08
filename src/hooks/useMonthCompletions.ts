import { useCallback, useEffect, useState } from 'react';

import { dayKey } from '@/src/lib/dates';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';

export interface DayState {
  completed: boolean;
  hasRecording: boolean;
  /** Present whenever `hasRecording` — the row needed to replay the day. */
  recordingId?: string;
  storagePath?: string;
}

/** Map of 'YYYY-MM-DD' -> completion/recording state for every day in the given month. */
export function useMonthCompletions(year: number, month0: number) {
  const { user } = useAuth();
  const [map, setMap] = useState<Record<string, DayState>>({});
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const start = `${year}-${String(month0 + 1).padStart(2, '0')}-01`;
    const endDate = new Date(year, month0 + 1, 0);
    const end = dayKey(endDate);

    const [{ data: completions }, { data: recordings }] = await Promise.all([
      supabase
        .from('day_completions')
        .select('day')
        .eq('user_id', user.id)
        .gte('day', start)
        .lte('day', end),
      supabase
        .from('recordings')
        .select('id, day, storage_path')
        .eq('user_id', user.id)
        .gte('day', start)
        .lte('day', end),
    ]);

    const next: Record<string, DayState> = {};
    for (const row of completions ?? []) {
      next[row.day] = { completed: true, hasRecording: next[row.day]?.hasRecording ?? false };
    }
    for (const row of recordings ?? []) {
      next[row.day] = {
        completed: next[row.day]?.completed ?? false,
        hasRecording: true,
        recordingId: row.id,
        storagePath: row.storage_path,
      };
    }
    setMap(next);
    setLoading(false);
  }, [user, year, month0]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { map, loading, refetch };
}

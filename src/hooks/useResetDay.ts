import { useCallback, useState } from 'react';

import { dayKey } from '@/src/lib/dates';
import { RECORDINGS_BUCKET, recordingStoragePath } from '@/src/lib/storage-paths';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';

/**
 * Clears everything recorded for a single day so the home screen returns to its
 * pre-recording state — the "Record · 1:00" card with `record` and `review`
 * still locked.
 *
 * A development affordance for stepping through the day's states without
 * waiting for tomorrow. It is destructive: the day's recording, its video file
 * and its completion row are all removed, and the streak is recomputed.
 *
 * The daily script is deliberately KEPT — the topic/title is what the day's
 * state is anchored to, and regenerating it is already a separate action
 * ("New script"). Pass `includeScript` to drop that too.
 */
export function useResetDay() {
  const { user, refreshProfile } = useAuth();
  const [resetting, setResetting] = useState(false);

  const resetDay = useCallback(
    async (day: string = dayKey(), options?: { includeScript?: boolean }) => {
      if (!user || resetting) return { ok: false, error: 'Not signed in' };
      setResetting(true);
      try {
        // Order matters: day_completions references recordings, so clear the
        // completion first to avoid leaving a row pointing at a deleted
        // recording (the FK is ON DELETE SET NULL, which would otherwise leave
        // the day looking complete with no recording behind it).
        const { error: completionError } = await supabase
          .from('day_completions')
          .delete()
          .eq('user_id', user.id)
          .eq('day', day);
        if (completionError) throw new Error(completionError.message);

        const { error: recordingError } = await supabase
          .from('recordings')
          .delete()
          .eq('user_id', user.id)
          .eq('day', day);
        if (recordingError) throw new Error(recordingError.message);

        // Best-effort: a leftover object is harmless (the next upload overwrites
        // this exact path) and shouldn't fail the reset.
        await supabase.storage.from(RECORDINGS_BUCKET).remove([recordingStoragePath(user.id, day)]);

        if (options?.includeScript) {
          const { error: scriptError } = await supabase
            .from('daily_scripts')
            .delete()
            .eq('user_id', user.id)
            .eq('day', day);
          if (scriptError) throw new Error(scriptError.message);
        }

        // Deleting a completion doesn't touch the cached streak/points on the
        // profile, so recompute them from what's left.
        const { data: remaining } = await supabase
          .from('day_completions')
          .select('day')
          .eq('user_id', user.id)
          .order('day', { ascending: false });

        await supabase
          .from('profiles')
          .update({
            current_streak: currentStreakFrom(remaining ?? []),
            points: (remaining ?? []).length,
          })
          .eq('id', user.id);

        await refreshProfile();
        return { ok: true as const };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : 'Reset failed' };
      } finally {
        setResetting(false);
      }
    },
    [user, resetting, refreshProfile],
  );

  return { resetDay, resetting };
}

/**
 * Length of the unbroken run of completed days ending today or yesterday.
 *
 * Yesterday counts as a live streak because today's recording hasn't been made
 * yet — treating it as broken would zero the streak every morning.
 */
function currentStreakFrom(rows: { day: string }[]): number {
  const days = new Set(rows.map((r) => r.day));
  if (days.size === 0) return 0;

  const today = dayKey();
  const cursor = new Date();
  if (!days.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

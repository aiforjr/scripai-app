import { useCallback, useEffect, useState } from 'react';

import { dayKey } from '@/src/lib/dates';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import type { DailyScript } from '@/src/types/database.types';

/**
 * Turns a functions.invoke() error into something worth showing a user.
 *
 * A non-2xx response only ever carries the generic "Edge Function returned a
 * non-2xx status code" as its message — the reason the function actually gave
 * (e.g. "Invalid session") lives in `context`, which is the raw Response. So
 * read the body before falling back to the generic text.
 */
async function describeFunctionError(fnError: unknown): Promise<string> {
  const context = (fnError as { context?: unknown })?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // Body wasn't JSON (an HTML gateway error page, say) — fall through.
    }
    if (context.status === 401) return 'Your session expired. Sign in again to get today’s script.';
    if (context.status === 404) return 'The script service isn’t deployed yet.';
    if (context.status >= 500) return 'The script service hit an error. Try again in a moment.';
  }
  return fnError instanceof Error ? fnError.message : 'Could not generate a script.';
}

export function useTodayScript(day: string = dayKey()) {
  const { user } = useAuth();
  const [script, setScript] = useState<DailyScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrGenerate = useCallback(
    async (topicTitle?: string) => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('generate-script', {
          body: { day, topic_title: topicTitle },
        });
        if (fnError) {
          setError(await describeFunctionError(fnError));
          return;
        }
        // A 2xx with no script means the function succeeded but returned an
        // unexpected shape (or an { error } body). Surfacing it as an error
        // beats silently leaving the teleprompter blank with no explanation.
        const nextScript = (data?.script as DailyScript | undefined) ?? null;
        if (!nextScript) {
          setError(
            typeof data?.error === 'string' ? data.error : 'The script service returned no script.',
          );
          return;
        }
        setScript(nextScript);
      } catch (err) {
        // invoke() throws rather than resolving on a network failure.
        setError(err instanceof Error ? err.message : 'Could not reach the script service.');
      } finally {
        setLoading(false);
      }
    },
    [user, day],
  );

  /**
   * Re-reads the stored script straight from the table — no edge-function call,
   * so it never generates or bills for anything. Cheap enough to run on every
   * screen focus, which is what keeps a script generated or edited on the record
   * screen from leaving a stale title behind on the home screen.
   */
  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('daily_scripts')
      .select('*')
      .eq('user_id', user.id)
      .eq('day', day)
      .maybeSingle();
    if (data) {
      setScript(data as DailyScript);
      setError(null);
    }
  }, [user, day]);

  useEffect(() => {
    fetchOrGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, day]);

  return { script, loading, error, regenerate: fetchOrGenerate, refresh };
}

import { useCallback, useEffect, useState } from 'react';

import { dayKey } from '@/src/lib/dates';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import type { Recording } from '@/src/types/database.types';

export function useRecordingForDay(day: string = dayKey()) {
  const { user } = useAuth();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('recordings')
      .select('*')
      .eq('user_id', user.id)
      .eq('day', day)
      .maybeSingle();
    setRecording((data as Recording | null) ?? null);
    setLoading(false);
  }, [user, day]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { recording, loading, refetch };
}

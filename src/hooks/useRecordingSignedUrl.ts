import { useEffect, useState } from 'react';

import { RECORDINGS_BUCKET } from '@/src/lib/storage-paths';
import { supabase } from '@/src/lib/supabase';

export function useRecordingSignedUrl(storagePath: string | undefined) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storagePath) return;
    let cancelled = false;
    supabase.storage
      .from(RECORDINGS_BUCKET)
      .createSignedUrl(storagePath, 3600)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  return url;
}

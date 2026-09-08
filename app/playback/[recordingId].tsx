import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import { X } from 'lucide-react-native';

import { useRecordingSignedUrl } from '@/src/hooks/useRecordingSignedUrl';
import { formatShort } from '@/src/lib/dates';
import * as haptics from '@/src/lib/haptics';
import { supabase } from '@/src/lib/supabase';
import { colors, radii, spacing, typography } from '@/src/theme/theme';
import type { Recording } from '@/src/types/database.types';

/**
 * Replay of a past day's clip, opened by tapping a recorded day in the home
 * calendar. Deliberately separate from `review/[recordingId]`: that screen is
 * the three-phase flow and writes `reviewed_*` plus `fn_complete_day` as the
 * user advances, so reusing it to rewatch a finished day would restart the
 * flow and re-run the completion RPC. This screen only ever reads.
 */
export default function PlaybackScreen() {
  const { recordingId } = useLocalSearchParams<{ recordingId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // No top inset here, unlike the fullScreenModal record/review routes: this
  // screen is presented as a `modal` sheet, which already begins below the
  // status bar, so adding the safe-area top again just opens a dead gap above
  // the title.
  const bottomInset = Math.max(insets.bottom, 24);

  const [recording, setRecording] = useState<Recording | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setRecording(data as Recording);
        else setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [recordingId]);

  const signedUrl = useRecordingSignedUrl(recording?.storage_path);
  const player = useVideoPlayer(signedUrl ?? '', (p) => {
    p.loop = false;
    // Deliberately not autoplayed — the clip waits on the play button. Seeking
    // slightly off zero surfaces a first frame to press play against; some
    // encoders emit a black frame at exactly 0.
    p.currentTime = 0.1;
  });

  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Your recording</Text>
          {recording ? <Text style={styles.subtitle}>{formatShort(recording.day)}</Text> : null}
        </View>
        <Pressable
          onPress={() => {
            haptics.tap();
            router.back();
          }}
          hitSlop={10}
          style={styles.closeButton}
        >
          <X size={18} strokeWidth={2.4} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.videoWrap}>
        {notFound ? (
          <Text style={styles.message}>That recording is no longer available.</Text>
        ) : signedUrl ? (
          <VideoView
            player={player}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            nativeControls
            fullscreenOptions={{ enable: true }}
          />
        ) : (
          <ActivityIndicator color={colors.white} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
  },
  title: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 22,
    color: colors.text,
  },
  subtitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoWrap: {
    flex: 1,
    borderRadius: radii.xl,
    backgroundColor: '#000',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  message: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.neutral[400],
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});

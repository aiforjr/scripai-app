import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';

import { Confetti } from '@/src/components/review/Confetti';
import { PulsingCheck } from '@/src/components/review/PulsingCheck';
import { Button } from '@/src/components/ui/Button';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { CheckIcon, RotateCcwIcon } from '@/src/components/ui/icons';
import { useRecordingSignedUrl } from '@/src/hooks/useRecordingSignedUrl';
import { addDays, dayKey, formatShort, parseDayKey } from '@/src/lib/dates';
import * as haptics from '@/src/lib/haptics';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radii, shadows, spacing, typography } from '@/src/theme/theme';
import type { Recording } from '@/src/types/database.types';

const { height: windowHeight } = Dimensions.get('window');
const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type Phase = 'audio' | 'video' | 'both' | 'complete';
const PHASES: { key: Phase; label: string }[] = [
  { key: 'audio', label: '1 · Audio only' },
  { key: 'video', label: '2 · Video, muted' },
  { key: 'both', label: '3 · Audio + video' },
];

export default function ReviewScreen() {
  const { recordingId } = useLocalSearchParams<{ recordingId: string }>();
  const router = useRouter();
  const { user, refreshProfile, profile } = useAuth();
  // Explicit floor values rather than relying solely on <SafeAreaView>: on
  // this fullScreenModal route (same as record/[date].tsx), the automatic
  // top inset has been observed to report 0 for a beat, letting the title
  // and Retry pill render under the status bar/notch.
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, 24);
  const bottomInset = Math.max(insets.bottom, 24);

  const [recording, setRecording] = useState<Recording | null>(null);
  const [phase, setPhase] = useState<Phase>('audio');
  const [hasFinishedPhase, setHasFinishedPhase] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [completion, setCompletion] = useState<{ streak: number } | null>(null);

  useEffect(() => {
    supabase
      .from('recordings')
      .select('*')
      .eq('id', recordingId)
      .single()
      .then(({ data }) => setRecording(data as Recording));
  }, [recordingId]);

  const signedUrl = useRecordingSignedUrl(recording?.storage_path);
  const player = useVideoPlayer(signedUrl ?? '', (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.25;
  });

  useEffect(() => {
    player.muted = phase === 'video';
    // Each phase replays the same clip from the top, so its progress bar
    // should start empty rather than carrying over the previous phase's.
    setPlaybackProgress(0);
    const sub = player.addListener('playingChange', ({ isPlaying: playing }) =>
      setIsPlaying(playing),
    );
    const timeSub = player.addListener('timeUpdate', ({ currentTime }) => {
      setPlaybackProgress(player.duration > 0 ? currentTime / player.duration : 0);
    });
    const endSub = player.addListener('playToEnd', () => {
      setIsPlaying(false);
      setHasFinishedPhase(true);
      setPlaybackProgress(1);
    });
    return () => {
      sub.remove();
      timeSub.remove();
      endSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, player]);

  function togglePlay() {
    haptics.tap();
    if (player.playing) {
      player.pause();
    } else {
      if (player.currentTime >= player.duration - 0.1) player.currentTime = 0;
      player.play();
    }
  }

  async function handleCompletePhase() {
    if (!recording || !user) return;
    const fieldMap: Record<Exclude<Phase, 'complete'>, keyof Recording> = {
      audio: 'reviewed_audio',
      video: 'reviewed_video',
      both: 'reviewed_both',
    };
    await supabase
      .from('recordings')
      .update({ [fieldMap[phase as Exclude<Phase, 'complete'>]]: true })
      .eq('id', recording.id);

    player.pause();
    setHasFinishedPhase(false);

    // The Button already fired `heavy()` on the press; `success()` lands here,
    // after the phase advances. The gap between the two is what makes them read
    // as two events rather than one buzz.
    if (phase === 'audio') {
      haptics.success();
      setPhase('video');
    } else if (phase === 'video') {
      haptics.success();
      setPhase('both');
    } else {
      const { data } = await supabase.rpc('fn_complete_day', {
        p_user_id: user.id,
        p_day: recording.day,
        p_recording_id: recording.id,
      });
      const streak = Array.isArray(data) ? data[0]?.current_streak : (data as any)?.current_streak;
      setCompletion({ streak: streak ?? (profile?.current_streak ?? 0) + 1 });
      // The product's biggest beat: fired after the RPC resolves so it arrives
      // *with* the confetti and the new streak, not on the press that started it.
      haptics.success();
      await refreshProfile();
      setPhase('complete');
    }
  }

  if (phase === 'complete') {
    return (
      <DayCompleteOverlay
        day={recording?.day ?? dayKey()}
        streak={completion?.streak ?? 0}
        router={router}
      />
    );
  }

  const captions: Record<Exclude<Phase, 'complete'>, string> = {
    audio: 'Close your eyes and just listen. Pacing, tone, filler words.',
    video: 'Mute and just watch. Posture, expressions, where your eyes go.',
    both: 'Now the whole thing. Notice how sound and picture fit together.',
  };
  const buttonLabels: Record<Exclude<Phase, 'complete'>, string> = {
    audio: 'Complete audio only review',
    video: 'Complete video only review',
    both: 'Complete review',
  };

  const phaseIndex = PHASES.findIndex((p) => p.key === phase);
  // Step-based, not blended with in-clip playback progress: it was already
  // sitting at (phaseIndex + 1) / 3 the moment a clip finished playing, so
  // pressing "Next" produced no visible movement. This way the bar only
  // advances — visibly — when the user actually presses the button.
  const overallProgress = phaseIndex / PHASES.length;

  return (
    <View
      style={[styles.container, { paddingTop: topInset + spacing.lg, paddingBottom: bottomInset }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Review the video</Text>
        <Pressable
          style={styles.retryPill}
          onPress={() => {
            haptics.tap();
            if (recording) router.replace(`/record/${recording.day}`);
          }}
        >
          <RotateCcwIcon size={15} color={colors.text} strokeWidth={2.2} />
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
      <Text style={styles.subhead}>Listen first, then watch, then both together.</Text>
      <ProgressBar progress={overallProgress} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.phaseList, shadows.card]}>
          {PHASES.map((p) => {
            const state =
              PHASES.findIndex((x) => x.key === phase) > PHASES.findIndex((x) => x.key === p.key)
                ? 'done'
                : p.key === phase
                  ? 'active'
                  : 'pending';
            return (
              <View key={p.key} style={styles.phaseRow}>
                <View
                  style={[
                    styles.phaseIcon,
                    state === 'active' && styles.phaseIconActive,
                    state === 'done' && styles.phaseIconDone,
                  ]}
                >
                  {state === 'done' && <CheckIcon size={12} color={colors.white} />}
                </View>
                <Text style={[styles.phaseLabel, state === 'pending' && styles.phaseLabelPending]}>
                  {p.label}
                </Text>
                {state === 'active' && <Text style={styles.nowPlaying}>Now playing</Text>}
                {state === 'done' && <Text style={styles.doneLabel}>Done</Text>}
              </View>
            );
          })}
        </View>

        <View style={[styles.playerCard, shadows.card]}>
          {phase === 'audio' ? (
            <View style={styles.wavePlaceholder}>
              {Array.from({ length: 24 }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.waveBar, { height: 8 + Math.abs(Math.sin(i)) * 30 }]}
                />
              ))}
              <Pressable onPress={togglePlay} style={styles.playButtonOverlay}>
                <Text style={styles.playButtonText}>{isPlaying ? '❚❚' : '▶'}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.videoWrap}>
              <VideoView
                player={player}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                nativeControls={false}
              />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{phase === 'video' ? 'Muted' : 'Sound on'}</Text>
              </View>
              <Pressable onPress={togglePlay} style={styles.playButtonOverlay}>
                <Text style={styles.playButtonText}>{isPlaying ? '❚❚' : '▶'}</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.playbackProgressTrack}>
            <View
              style={[
                styles.playbackProgressFill,
                { width: `${Math.max(0, Math.min(1, playbackProgress)) * 100}%` },
              ]}
            />
          </View>
        </View>

        <Text style={styles.caption}>{captions[phase as Exclude<Phase, 'complete'>]}</Text>
      </ScrollView>

      <Button
        title={buttonLabels[phase as Exclude<Phase, 'complete'>]}
        disabled={!hasFinishedPhase}
        onPress={handleCompletePhase}
      />
    </View>
  );
}

function DayCompleteOverlay({
  day,
  streak,
  router,
}: {
  day: string;
  streak: number;
  router: ReturnType<typeof useRouter>;
}) {
  const date = parseDayKey(day);
  const dayNum = date.getDate();
  // The card's own frame drives the burst: particles launch at its midline and
  // settle across its height, so the scatter tracks the dialog whatever size
  // the streak text makes it.
  const [cardFrame, setCardFrame] = useState<{ y: number; height: number } | null>(null);
  const weekDates = useMemo(() => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, [day]);

  return (
    <View style={styles.completeBackdrop}>
      <View
        style={[styles.completeCard, shadows.cardLg]}
        onLayout={(e) => {
          const { y, height: h } = e.nativeEvent.layout;
          setCardFrame({ y, height: h });
        }}
      >
        <PulsingCheck />
        {/* One block: the design pairs the two with a 6px gap, inside the
            card's larger 22px rhythm. */}
        <View style={styles.completeTitleBlock}>
          <Text style={styles.completeHeading}>Day {dayNum}</Text>
          <Text style={styles.completeSub}>
            {formatShort(day)} · {streak}-day streak
          </Text>
        </View>

        <View style={styles.weekStrip}>
          {weekDates.map((d, i) => {
            const key = dayKey(d);
            const isPast = key <= day;
            return (
              <View key={i} style={styles.weekCell}>
                <Text style={styles.weekLabel}>{WEEKDAY_LABELS[i]}</Text>
                <Text style={styles.weekDate}>{d.getDate()}</Text>
                <View
                  style={[
                    styles.weekDot,
                    isPast && styles.weekDotDone,
                    key === day && styles.weekDotToday,
                  ]}
                >
                  {isPast && <CheckIcon size={12} color={colors.white} />}
                </View>
              </View>
            );
          })}
        </View>

        <Button title="Done for the day" onPress={() => router.replace('/(tabs)/home')} />
        {/* TODO: this has no `onPress` — a dead affordance that looks tappable
            but does nothing. Deliberately left without a haptic: feedback on a
            no-op would only make the dead end more convincing. Needs either a
            real save-to-gallery implementation or removal. */}
        <Pressable>
          <Text style={styles.saveLink}>Save video to gallery</Text>
        </Pressable>
      </View>

      {/* Last child so the burst layers over the dialog — the mockup shows
          particles resting on the card and the Done button, not behind them.
          Waits for layout so the scatter is sized to the real card. */}
      {cardFrame != null && (
        <Confetti
          centerY={(cardFrame.y + cardFrame.height / 2) / windowHeight}
          spreadY={cardFrame.height / windowHeight / 2}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: typography.fontFamily.extrabold, fontSize: 20, color: colors.text },
  retryPill: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  retryText: { fontFamily: typography.fontFamily.semibold, fontSize: 13, color: colors.text },
  subhead: { fontFamily: typography.fontFamily.regular, fontSize: 14, color: colors.neutral[700] },
  scroll: { flex: 1 },
  scrollContent: { gap: spacing.md, paddingBottom: spacing.md },
  phaseList: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  phaseIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseIconActive: { backgroundColor: colors.accent.DEFAULT },
  phaseIconDone: { backgroundColor: colors.success },
  phaseLabel: {
    flex: 1,
    fontFamily: typography.fontFamily.semibold,
    fontSize: 14,
    color: colors.text,
  },
  phaseLabelPending: { color: colors.neutral[400] },
  nowPlaying: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 11,
    color: colors.accent.DEFAULT,
  },
  doneLabel: { fontFamily: typography.fontFamily.semibold, fontSize: 11, color: colors.success },
  playerCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 220,
    justifyContent: 'center',
  },
  wavePlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: '100%',
    height: 120,
  },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: colors.accent[300] },
  videoWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.neutral[900],
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.white, fontFamily: typography.fontFamily.semibold, fontSize: 11 },
  playbackProgressTrack: {
    width: '100%',
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral[200],
    overflow: 'hidden',
  },
  playbackProgressFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.accent.DEFAULT,
  },
  playButtonOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -30,
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  playButtonText: { color: colors.white, fontSize: 20 },
  caption: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.neutral[600],
    textAlign: 'center',
  },
  completeBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  // Design: padding 56px 20px 28px, gap 22, radius 20. The deep top padding is
  // what gives the check badge its room above the heading.
  completeCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 28,
    width: '100%',
    alignItems: 'center',
    gap: 22,
  },
  completeTitleBlock: { alignItems: 'center', gap: 6 },
  completeHeading: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 28,
    lineHeight: 31,
    color: colors.text,
  },
  completeSub: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.neutral[700],
  },
  // A panel on the page-gray ground, each column stacking weekday / date / dot.
  weekStrip: {
    flexDirection: 'row',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    backgroundColor: colors.background,
  },
  weekCell: { flex: 1, alignItems: 'center', gap: 6 },
  weekLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 10,
    color: colors.neutral[600],
  },
  weekDate: { fontFamily: typography.fontFamily.extrabold, fontSize: 13, color: colors.text },
  weekDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotDone: { backgroundColor: colors.accent.DEFAULT },
  // A soft halo ring rather than a hard border, per the design's
  // `box-shadow: 0 0 0 3px accent-200` on today's dot.
  weekDotToday: { borderWidth: 3, borderColor: colors.accent[200] },
  saveLink: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 14,
    color: colors.accent.DEFAULT,
  },
});

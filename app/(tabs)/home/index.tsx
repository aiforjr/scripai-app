import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MonthCalendar } from '@/src/components/calendar/MonthCalendar';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { CheckIcon, FlameIcon, LockIcon } from '@/src/components/ui/icons';
import { Button } from '@/src/components/ui/Button';
import { useMonthCompletions } from '@/src/hooks/useMonthCompletions';
import { useRecordingForDay } from '@/src/hooks/useRecordingForDay';
import { useTodayScript } from '@/src/hooks/useTodayScript';
import { dayKey, formatShort } from '@/src/lib/dates';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radii, shadows, spacing, typography } from '@/src/theme/theme';

export default function Home() {
  const router = useRouter();
  const { profile } = useAuth();
  const today = dayKey();
  const [viewDate, setViewDate] = useState(() => new Date());
  const year = viewDate.getFullYear();
  const month0 = viewDate.getMonth();

  const { script, loading: scriptLoading } = useTodayScript(today);
  const { recording } = useRecordingForDay(today);
  const { map: dayStates } = useMonthCompletions(year, month0);

  const firstName = profile?.name?.split(' ')[0] ?? 'there';
  const recordingDone = !!recording?.completed_at;
  const recordingInProgress = !!recording && !recordingDone;

  return (
    <View style={styles.container}>
      <ScreenHeader
        // title={`Welcome ${firstName}`}
        title="Welcome"
        right={
          // The streak is a drill-down into the stats screen, which breaks down
          // the same number into lifetime days / current / best streak.
          <Pressable
            onPress={() => router.push('/(tabs)/leaderboard/standing')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`${profile?.current_streak ?? 0} day streak. View your stats.`}
            style={({ pressed }) => [styles.streakPill, pressed && styles.streakPillPressed]}
          >
            <FlameIcon size={16} color={colors.white} />
            <Text style={styles.streakText}>{profile?.current_streak ?? 0}</Text>
          </Pressable>
        }
      />

      <ScrollView style={styles.body} contentContainerStyle={styles.scroll}>
        <MonthCalendar
          year={year}
          month0={month0}
          dayStates={dayStates}
          onPrevMonth={() => setViewDate(new Date(year, month0 - 1, 1))}
          onNextMonth={() => setViewDate(new Date(year, month0 + 1, 1))}
          onSelectDay={(key) => {
            const state = dayStates[key];
            if (!state?.recordingId) return;
            // A finished day replays read-only; an unfinished one (recorded but
            // never reviewed through) resumes the review flow instead, so the
            // tap can still carry the day to completion.
            router.push(
              state.completed ? `/playback/${state.recordingId}` : `/review/${state.recordingId}`,
            );
          }}
        />
      </ScrollView>

      {/* Sticky above the tab bar: the day's task is always one tap away, no
          matter how far the calendar has been scrolled. */}
      <View style={styles.taskDock}>
        <View style={[styles.taskCard, shadows.cardLg]}>
          <Text style={styles.taskLabel}>Today · {formatShort(today)}</Text>
          {scriptLoading ? (
            <ActivityIndicator
              color={colors.accent.DEFAULT}
              style={{ marginVertical: spacing.md }}
            />
          ) : (
            <Text style={styles.taskPrompt}>
              {script?.topic_title ?? 'Your script is on its way…'}
            </Text>
          )}

          <View style={styles.stepsRow}>
            <Step label="Topic" done />
            <StepLine done={!!recording} />
            <Step label="Record" done={!!recording} />
            <StepLine done={recordingDone} />
            <Step label="Review" done={recordingDone} />
          </View>

          {recordingDone ? (
            <Button title="Done for today ✓" variant="secondary" disabled />
          ) : recordingInProgress ? (
            <Button
              title="Continue review"
              onPress={() => router.push(`/review/${recording!.id}`)}
            />
          ) : (
            <Button
              title="Record · 1:00"
              onPress={() => router.push(`/record/${today}`)}
              disabled={scriptLoading}
            />
          )}
        </View>
      </View>
    </View>
  );
}

function Step({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepDot, done && styles.stepDotDone]}>
        {done ? (
          <CheckIcon size={11} color={colors.white} />
        ) : (
          <LockIcon size={12} color={colors.neutral[400]} />
        )}
      </View>
      <Text style={styles.stepLabel}>{label}</Text>
    </View>
  );
}

function StepLine({ done }: { done: boolean }) {
  return <View style={[styles.stepConnector, done && styles.stepConnectorDone]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // White so the header bar's colour carries up behind the status bar; the
    // body below paints itself page-gray.
    backgroundColor: colors.white,
  },
  body: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    // Matches the header-to-content gap the other tabs use (settings and
    // leaderboard both sit at spacing.md), so the tab bar feels consistent.
    paddingTop: spacing.md,
    gap: spacing.lg,
    // The dock below owns the gap to the task card, so the scroll only needs
    // enough to keep the last row clear of it when fully scrolled.
    paddingBottom: spacing.sm,
  },
  taskDock: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    // Sits directly above the tab bar, so it takes the same bottom gap the
    // other tabs leave under their last card (premium's scroll content = 14)
    // rather than floating on a wider margin of its own.
    paddingTop: spacing.md,
    paddingBottom: 14,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent.DEFAULT,
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radii.pill,
    ...shadows.button,
  },
  streakPillPressed: {
    opacity: 0.85,
  },
  streakText: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 16,
    color: colors.white,
  },
  taskCard: {
    backgroundColor: colors.neutral[900],
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  taskLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.neutral[400],
  },
  taskPrompt: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 19,
    lineHeight: 26,
    color: colors.white,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  step: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: colors.accent.DEFAULT,
  },
  stepLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 10,
    color: colors.neutral[400],
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.neutral[700],
    marginHorizontal: 4,
    marginBottom: 14,
  },
  stepConnectorDone: {
    backgroundColor: colors.accent.DEFAULT,
  },
});

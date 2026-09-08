import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Confetti } from '@/src/components/review/Confetti';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { CheckIcon } from '@/src/components/ui/icons';
import { OnboardingBadge } from '@/src/components/ui/OnboardingBadge';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { StepHeader } from '@/src/components/ui/StepHeader';
import {
  buildChallengeWindow,
  buildMonthGrid,
  challengeMonths,
  CHALLENGE_DAYS,
  formatMonthYear,
} from '@/src/lib/dates';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** One gap value for calendar → callout → Next, so all three are evenly spaced. */
const ELEMENT_GAP = spacing.lg;

/**
 * Per-check cadence of the fill animation, and the pause held on a full month before
 * advancing. At 110ms the 30-day run takes a little over 3s, slow enough to follow
 * each check landing.
 */
const CHECK_INTERVAL_MS = 110;
const MONTH_HOLD_MS = 800;

export default function StreakIntro() {
  const router = useRouter();

  const today = useMemo(() => new Date(), []);
  // The challenge is always 30 days from today, so a run starting late in a month
  // spills into the next one — hence a list of months to step through, not one.
  const window = useMemo(() => buildChallengeWindow(today), [today]);
  const months = useMemo(() => challengeMonths(window), [window]);

  const [monthIndex, setMonthIndex] = useState(0);
  const [checkedCount, setCheckedCount] = useState(0);

  const activeMonth = months[monthIndex] ?? months[0];
  const grid = useMemo(() => buildMonthGrid(activeMonth.year, activeMonth.month0), [activeMonth]);
  const monthLabel = useMemo(
    () => formatMonthYear(activeMonth.year, activeMonth.month0),
    [activeMonth],
  );

  // Day keys checked so far, as a set for O(1) cell lookup.
  const checkedKeys = useMemo(() => new Set(window.slice(0, checkedCount)), [window, checkedCount]);

  // Drives the fill: one check per tick. When the last check of the visible month
  // lands and days remain, hold briefly so the completed month reads, then advance.
  // `reduce motion` skips straight to the final month, fully checked.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        setMonthIndex(months.length - 1);
        setCheckedCount(CHALLENGE_DAYS);
        return;
      }

      const step = (drawn: number) => {
        if (cancelled || drawn >= CHALLENGE_DAYS) return;

        const next = drawn + 1;
        setCheckedCount(next);

        const justDrawn = window[drawn];
        const following = window[next];
        const crossesMonth =
          following !== undefined && following.slice(0, 7) !== justDrawn.slice(0, 7);

        timer.current = setTimeout(
          () => {
            if (cancelled) return;
            if (crossesMonth) setMonthIndex((i) => Math.min(i + 1, months.length - 1));
            step(next);
          },
          crossesMonth ? MONTH_HOLD_MS : CHECK_INTERVAL_MS,
        );
      };

      step(0);
    });

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [window, months]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ProgressBar progress={0.9} />
      <StepHeader />

      <View style={styles.content}>
        <OnboardingBadge />
        <Text style={styles.heading}>Ready for the 30-day challenge?</Text>
        <Text style={styles.subhead}>One take a day, every day this month.</Text>

        <Card>
          <View style={styles.monthRow}>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Text style={styles.monthCount}>{CHALLENGE_DAYS} days</Text>
          </View>
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label, i) => (
              <Text key={`${label}-${i}`} style={styles.weekdayLabel}>
                {label}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {grid.map((cell) => {
              // A cell fills only once the animation reaches its day. Lead/trail days
              // from the neighbouring month stay empty even when in the window — they
              // get their check when the calendar advances to the month they belong to.
              const checked = cell.inMonth && checkedKeys.has(cell.key);
              return (
                <View key={cell.key} style={styles.cell}>
                  {checked ? (
                    // A checked day shows the tick alone — the number would only
                    // compete with it.
                    <View style={styles.dayChecked}>
                      <CheckIcon size={16} color={colors.white} strokeWidth={3} />
                    </View>
                  ) : (
                    <View style={styles.dayEmpty}>
                      <Text style={[styles.dayText, !cell.inMonth && styles.dayTextOutside]}>
                        {cell.day}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Card>

        <Card style={styles.calloutCard}>
          <Text style={styles.calloutText}>
            People who reach a 7-day streak are 3× more likely to finish the month.
          </Text>
        </Card>
      </View>

      <Button title="Next" variant="primary" onPress={() => router.push('/(onboarding)/outcome')} />

      {/* Fires when the 30th check lands — the finished challenge. Rendered last so
          it falls over the whole screen, and `pointerEvents="none"` inside Confetti
          keeps the Next button tappable through it. */}
      {checkedCount >= CHALLENGE_DAYS && <Confetti origin="top" />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  // Sizes to its content rather than `flex: 1`: stretching would absorb the slack
  // and push Next to the bottom edge, making the callout→button gap larger than
  // the calendar→callout one.
  content: {
    paddingTop: spacing.xl,
    marginBottom: ELEMENT_GAP,
  },
  heading: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.size.h2,
    color: colors.text,
    letterSpacing: -0.4,
  },
  subhead: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.neutral[700],
    marginTop: spacing.xs,
    marginBottom: spacing.xxl,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthLabel: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.size.h4,
    color: colors.text,
    letterSpacing: -0.2,
  },
  monthCount: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.neutral[500],
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.fontFamily.semibold,
    fontSize: 11,
    color: colors.neutral[500],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  // Rounded accent square with a white tick — the challenge grid shows commitment,
  // not dates, so no day numbers are drawn.
  dayChecked: {
    flex: 1,
    alignSelf: 'stretch',
    borderRadius: radii.sm - 4,
    backgroundColor: colors.accent.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Days outside the run keep the cell's footprint so the grid never reflows as
  // checks land, and carry their date until a check replaces it.
  dayEmpty: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.neutral[700],
  },
  // Lead/trail days from the neighbouring month sit back so the active month reads
  // as the subject of the grid.
  dayTextOutside: {
    color: colors.neutral[400],
  },
  calloutCard: {
    backgroundColor: colors.accent[100],
    // Gap to the calendar above. The identical gap below it — callout to Next — comes
    // from `content`'s marginBottom, so calendar/callout/button are evenly spaced
    // rather than the button being pushed to the safe-area edge.
    marginTop: ELEMENT_GAP,
  },
  calloutText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 14,
    color: colors.accent[700],
    lineHeight: 20,
  },
});

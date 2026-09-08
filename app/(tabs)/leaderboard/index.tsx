import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { FlameIcon, LockIcon } from '@/src/components/ui/icons';
import { useMonthDayCount } from '@/src/hooks/useMonthDayCount';
import { useAuth } from '@/src/providers/AuthProvider';
import {
  BOARD_SIZE,
  HARDCODED_RANK,
  NEIGHBOURS,
  PODIUM,
  type RivalRow,
} from '@/src/lib/placeholder-rivals';
import { formatDuration } from '@/src/lib/recording';
import { STREAK_TO_UNLOCK, numberWord } from '@/src/lib/streaks';
import { supabase } from '@/src/lib/supabase';
import { colors, radii, shadows, spacing, typography } from '@/src/theme/theme';
import type { LeaderboardRow } from '@/src/types/database.types';

// TEMPORARY (testing): forces the leaderboard past its streak gate so the
// ranked view can be worked on without first building a streak. Set to false to
// restore the real gate. Do not ship as true.
const BYPASS_STREAK_GATE = true;

/**
 * The two ranking windows, in tab order — "This month" leads, since the current
 * month is the more actionable of the two. "Country" was dropped: the board has
 * no regional data.
 *
 * Keyed by name rather than index so the tab order can change without silently
 * swapping which metric each tab ranks by.
 */
const SEGMENTS = [
  { key: 'month', label: 'This month' },
  { key: 'lifetime', label: 'Lifetime' },
] as const;

type SegmentKey = (typeof SEGMENTS)[number]['key'];

// NOTE: there's no dedicated "lifetime days logged" column on the leaderboard view,
// so `points` (accrued once per completed day) is used as that stand-in throughout
// this screen and standing.tsx. `longest_streak` is reserved for the "best streak" stat.
function lifetimeDays(row: LeaderboardRow): number {
  return row.points;
}

/**
 * One row as the board renders it, after the real user and the placeholder
 * rivals have been flattened into a single shape.
 */
interface BoardEntry {
  key: string;
  label: string;
  /** Avatar glyph. Every rival label starts with "S", so it can't be derived. */
  initial: string;
  days: number;
  currentStreak: number;
  isYou: boolean;
}

export default function LeaderboardIndex() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [mine, setMine] = useState<LeaderboardRow | null>(null);
  const [segment, setSegment] = useState<SegmentKey>('month');
  const { monthDays } = useMonthDayCount(user?.id);

  const unlocked = BYPASS_STREAK_GATE || (profile?.current_streak ?? 0) >= STREAK_TO_UNLOCK;

  // Only the signed-in user's row is read from the board — every other row is a
  // placeholder until there are real users to rank against.
  useEffect(() => {
    if (!unlocked || !user?.id) return;
    let mounted = true;
    supabase
      .from('leaderboard')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!mounted) return;
        setMine(error ? null : (data as LeaderboardRow | null));
      });
    return () => {
      mounted = false;
    };
  }, [unlocked, user?.id]);

  if (!unlocked) {
    const days = Math.min(profile?.current_streak ?? 0, STREAK_TO_UNLOCK);
    const remaining = STREAK_TO_UNLOCK - days;
    return (
      <View style={styles.container}>
        <ScreenHeader title="Leaderboard" />

        <View style={styles.lockedWrap}>
          <Card style={styles.lockedCard}>
            <View style={styles.lockedIcon}>
              <LockIcon size={34} color={colors.neutral[600]} />
            </View>
            <Text style={styles.lockedHeading}>Unlocks at a {STREAK_TO_UNLOCK}-day streak</Text>
            <Text style={styles.lockedBody}>
              Record and review {numberWord(STREAK_TO_UNLOCK)} days in a row to join the board.
              You&apos;re on day {profile?.current_streak ?? 0}.
            </Text>

            <View style={styles.segmentsRow}>
              {Array.from({ length: STREAK_TO_UNLOCK }, (_, i) => (
                <View
                  key={i}
                  style={[styles.progressSegment, i < days && styles.progressSegmentFilled]}
                />
              ))}
            </View>
            <Text style={styles.caption}>
              {days} of {STREAK_TO_UNLOCK} days ·{' '}
              {remaining === 1 ? 'one more to go' : `${remaining} more to go`}
            </Text>
          </Card>

          <Card style={styles.infoCard}>
            <Text style={styles.infoLabel}>How ranking works</Text>
            <Text style={styles.infoBody}>
              Ranked by <Text style={styles.infoBodyStrong}>total days logged</Text>. A missed day
              costs your streak, never your place.
            </Text>
          </Card>

          {/* Spacer pushes the CTA to the bottom of the screen, as in the design. */}
          <View style={styles.lockedSpacer} />

          <Button
            title={`Record today · ${formatDuration()}`}
            onPress={() => router.push('/(tabs)/home')}
          />
        </View>
      </View>
    );
  }

  // The board shows the podium plus a window of rows centred on the user, the
  // way a real leaderboard surfaces a deep position. Ranks are hard-coded for
  // now (see placeholder-rivals.ts) rather than derived from the row count.
  const myRank = HARDCODED_RANK[segment];
  const { above, below } = NEIGHBOURS[segment];

  // Your own day count comes from Supabase, but it has to sit between your
  // neighbours' for the window to read coherently — so the real figure is used
  // only when it does, and otherwise it's placed midway between them.
  const realDays = segment === 'lifetime' ? (mine ? lifetimeDays(mine) : 0) : monthDays;
  const floor = below[0]?.days ?? 0;
  const ceiling = above[above.length - 1]?.days ?? realDays;
  const myDays =
    realDays > floor && realDays < ceiling ? realDays : Math.round((floor + ceiling) / 2);

  const you: BoardEntry = {
    key: user?.id ?? 'you',
    label: 'You',
    initial: (profile?.name ?? 'Y').trim().charAt(0).toUpperCase() || 'Y',
    days: myDays,
    currentStreak: profile?.current_streak ?? 0,
    isYou: true,
  };

  const toEntry = (rival: RivalRow): BoardEntry => ({
    key: rival.id,
    label: rival.label,
    initial: rival.label.charAt(0).toUpperCase(),
    days: rival.days,
    currentStreak: rival.currentStreak,
    isYou: false,
  });

  // Podium order on screen is #2, #1, #3 (center tallest) per screens-spec 1nb.
  const podiumEntries = PODIUM[segment].map(toEntry);
  const podiumOrder = [podiumEntries[1], podiumEntries[0], podiumEntries[2]].filter(
    Boolean,
  ) as BoardEntry[];
  const podiumRankOf = (entry: BoardEntry) => podiumEntries.indexOf(entry) + 1;

  // The window: neighbours above, you in the middle, neighbours below. With two
  // on each side you land on the centre row of five.
  const window: BoardEntry[] = [...above.map(toEntry), you, ...below.map(toEntry)];
  const firstWindowRank = myRank - above.length;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Leaderboard" />

      <View style={styles.body}>
        <View style={styles.segmentedControl}>
          {SEGMENTS.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => setSegment(key)}
              style={[styles.segmentPill, segment === key && styles.segmentPillActive]}
            >
              <Text style={[styles.segmentLabel, segment === key && styles.segmentLabelActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Card style={styles.podiumCard}>
            {podiumOrder.map((entry) => {
              const rank = podiumRankOf(entry);
              const isFirst = rank === 1;
              return (
                <View key={entry.key} style={styles.podiumCol}>
                  <View style={styles.podiumAvatarWrap}>
                    <View
                      style={[
                        styles.podiumAvatar,
                        isFirst && styles.podiumAvatarFirst,
                        entry.isYou && styles.podiumAvatarYou,
                      ]}
                    >
                      <Text style={[styles.podiumInitial, isFirst && styles.podiumInitialFirst]}>
                        {entry.initial}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.podiumBadge,
                        isFirst ? styles.podiumBadgeFirst : styles.podiumBadgeRest,
                      ]}
                    >
                      <Text style={styles.podiumBadgeText}>{rank}</Text>
                    </View>
                  </View>
                  <Text style={styles.podiumName} numberOfLines={1}>
                    {entry.label}
                  </Text>
                  <Text style={styles.podiumDays}>{entry.days} days</Text>
                </View>
              );
            })}
          </Card>

          {/* The window starts below rank 4, so mark the skipped stretch. */}
          {firstWindowRank > 4 && <Text style={styles.gapNote}>···</Text>}

          <Card style={styles.listCard}>
            {window.map((entry, i) => (
              <Pressable
                key={entry.key}
                onPress={
                  entry.isYou ? () => router.push('/(tabs)/leaderboard/standing') : undefined
                }
                style={[
                  styles.row,
                  entry.isYou && styles.rowYou,
                  i < window.length - 1 && styles.rowDivider,
                ]}
              >
                <Text style={styles.rowRank}>{firstWindowRank + i}</Text>
                <View style={[styles.rowAvatar, entry.isYou && styles.rowAvatarYou]}>
                  <Text style={styles.rowInitial}>{entry.initial}</Text>
                </View>
                <View style={styles.rowNameCol}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {entry.label}
                  </Text>
                  <View style={styles.rowStreakRow}>
                    <FlameIcon size={13} color={colors.neutral[600]} />
                    <Text style={styles.rowStreak}>{entry.currentStreak}-day streak</Text>
                  </View>
                </View>
                <Text style={styles.rowDays}>
                  {entry.days} <Text style={styles.rowDaysUnit}>days</Text>
                </Text>
              </Pressable>
            ))}
          </Card>

          <Text style={styles.footerCaption}>
            You&apos;re #{myRank} of {BOARD_SIZE[segment].toLocaleString()} ·{' '}
            {segment === 'lifetime' ? 'ranked by days logged' : 'ranked by days logged this month'}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },

  // Locked state
  lockedWrap: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 14,
  },
  lockedCard: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: spacing.lg,
    gap: 14,
  },
  lockedIcon: {
    width: 80,
    height: 80,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedHeading: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 19,
    color: colors.text,
    textAlign: 'center',
  },
  lockedBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.neutral[700],
    textAlign: 'center',
  },
  segmentsRow: {
    flexDirection: 'row',
    // 4px rather than the design's 8px: that gap was tuned for 3 segments, and
    // at STREAK_TO_UNLOCK=12 an 8px gap spends more width on gaps than on bars.
    gap: spacing.xs,
    width: '100%',
    marginTop: spacing.xs,
  },
  progressSegment: {
    flex: 1,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral[200],
  },
  progressSegmentFilled: {
    backgroundColor: colors.accent.DEFAULT,
  },
  caption: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.accent[700],
    textAlign: 'center',
  },
  infoCard: {
    gap: 10,
  },
  infoLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    letterSpacing: 0.88,
    textTransform: 'uppercase',
    color: colors.neutral[600],
  },
  infoBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.neutral[800],
  },
  infoBodyStrong: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.text,
  },
  lockedSpacer: {
    flex: 1,
  },

  // Board state
  segmentedControl: {
    flexDirection: 'row',
    // Design uses a white pill on the gray page with the active tab in accent —
    // the inverse of the old gray track with a white active pill.
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    padding: 3,
    marginBottom: 14,
    ...shadows.card,
  },
  segmentPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    // One notch under the track's radii.sm so the active pill's corner sits
    // concentric inside the 3px track padding rather than bulging past it.
    borderRadius: radii.sm - 3,
    alignItems: 'center',
  },
  segmentPillActive: {
    backgroundColor: colors.accent.DEFAULT,
  },
  segmentLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.neutral[700],
  },
  segmentLabelActive: {
    color: colors.white,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    gap: 14,
  },
  podiumCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: spacing.md,
    gap: 0,
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  podiumAvatarWrap: {
    position: 'relative',
    alignItems: 'center',
  },
  podiumAvatar: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    backgroundColor: colors.neutral[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumAvatarFirst: {
    width: 68,
    height: 68,
    backgroundColor: colors.neutral[900],
  },
  podiumAvatarYou: {
    backgroundColor: colors.accent.DEFAULT,
  },
  podiumInitial: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 24,
    color: colors.white,
  },
  podiumInitialFirst: {
    fontSize: 29,
  },
  // Rank medallion overlapping the bottom of the avatar.
  podiumBadge: {
    position: 'absolute',
    bottom: -6,
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumBadgeFirst: {
    backgroundColor: '#f5b800',
  },
  podiumBadgeRest: {
    backgroundColor: colors.neutral[400],
  },
  podiumBadgeText: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.size.xs,
    color: colors.white,
  },
  podiumName: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.text,
    marginTop: spacing.xs,
  },
  podiumDays: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.neutral[600],
  },
  // Marks the ranks skipped between the podium and the user's window.
  gapNote: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 16,
    letterSpacing: 2,
    color: colors.neutral[400],
    textAlign: 'center',
    marginTop: -4,
    marginBottom: -4,
  },
  // Rows sit inside one card, separated by hairlines, per the design.
  listCard: {
    paddingVertical: 0,
    paddingHorizontal: spacing.xs,
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
  },
  rowYou: {
    // A flush tinted band rather than a rounded pill: the rows above and below
    // draw full-width dividers regardless, so a radius here had nothing to
    // round against and only broke the list's rhythm. The tint alone marks the
    // row; it keeps its divider like every other row.
    backgroundColor: colors.accent[100],
  },
  rowRank: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 13,
    color: colors.neutral[600],
    // Wider than the design's 22px: lifetime ranks run to three digits.
    width: 30,
  },
  rowAvatar: {
    width: 36,
    height: 36,
    // Smaller than the 56px avatars' radii.sm so the corner reads as the same
    // shape at this size rather than the same number of pixels.
    borderRadius: 10,
    backgroundColor: colors.neutral[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowAvatarYou: {
    backgroundColor: colors.accent.DEFAULT,
  },
  rowInitial: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 15,
    color: colors.white,
  },
  rowNameCol: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.text,
  },
  rowStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowStreak: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.neutral[600],
  },
  rowDays: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 15,
    color: colors.text,
  },
  rowDaysUnit: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    color: colors.neutral[600],
  },
  footerCaption: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.neutral[600],
    textAlign: 'center',
    paddingBottom: spacing.md,
  },
});

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProfileStatsCard } from '@/src/components/profile/ProfileStatsCard';
import { Card } from '@/src/components/ui/Card';
import { FlameIcon } from '@/src/components/ui/icons';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { BadgesRow } from '@/src/components/settings/BadgesRow';
import { describeMovement, useRankMovement } from '@/src/hooks/useRankMovement';
import { useAuth } from '@/src/providers/AuthProvider';
import { supabase } from '@/src/lib/supabase';
import { colors, radii, spacing, typography } from '@/src/theme/theme';
import type { LeaderboardRow } from '@/src/types/database.types';

export default function Standing() {
  const { profile, user } = useAuth();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    let mounted = true;
    supabase
      .from('leaderboard')
      .select('*')
      .order('rank', { ascending: true })
      .limit(50)
      .then(({ data, error }) => {
        if (!mounted) return;
        setRows(!error && data ? (data as LeaderboardRow[]) : []);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const { movement } = useRankMovement(user?.id);

  const me = rows.find((r) => r.user_id === user?.id);
  const rank = me?.rank ?? null;
  // Board size comes from the snapshot when available — `rows` is capped at 50,
  // so counting it would understate the total on a larger board.
  const total = movement?.board_size ?? rows.length;
  // Lifetime days stand-in: see NOTE in leaderboard/index.tsx — `points` accrues once
  // per completed day, so it's the closest field to "lifetime days logged".
  const lifetimeDays = me?.points ?? profile?.points ?? 0;
  const currentStreak = profile?.current_streak ?? 0;
  const bestStreak = profile?.longest_streak ?? 0;
  const movementLabel = describeMovement(movement);

  const nextUp = rank && rank > 1 ? rows.find((r) => r.rank === rank - 1) : null;
  const gap = nextUp ? Math.max(0, nextUp.points - lifetimeDays) : null;
  const progressPct = nextUp && nextUp.points > 0 ? Math.min(1, lifetimeDays / nextUp.points) : 0.8;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Your standing" showBack />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* The movement clause is omitted until there's a week of rank history to
            compare against — see useRankMovement. */}
        <ProfileStatsCard
          name={profile?.name ?? 'You'}
          rankLine={`${rank ? `#${rank} of ${total.toLocaleString()}` : 'Unranked'}${
            movementLabel ? ` · ${movementLabel}` : ''
          }`}
          lifetimeDays={lifetimeDays}
          currentStreak={currentStreak}
          bestStreak={bestStreak}
          accessory={
            <View style={styles.streakPill}>
              <FlameIcon size={14} color={colors.white} />
              <Text style={styles.streakPillText}>{currentStreak}</Text>
            </View>
          }
        />

        <Card style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressTitle}>Next: top 3</Text>
            <Text style={styles.progressValue} numberOfLines={1}>
              {nextUp ? `${gap} days behind` : 'Keep logging days'}
            </Text>
          </View>
          <ProgressBar progress={progressPct} />
        </Card>

        <Text style={styles.sectionTitle}>Badges</Text>
        <BadgesRow longestStreak={bestStreak} />
      </ScrollView>
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
    // 16px page gutter and 14px card gap, matching the rest of the leaderboard.
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    gap: 14,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    height: 34,
    borderRadius: radii.pill,
    // Now the card is white the accent is available again, and a flame streak
    // badge is exactly what it's for. On the old dark card this had to be
    // translucent white, which left the accent for the avatar alone.
    backgroundColor: colors.accent.DEFAULT,
  },
  streakPillText: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.size.sm,
    color: colors.white,
  },
  progressCard: {
    gap: spacing.md,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  progressTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.text,
  },
  progressValue: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.neutral[600],
    flexShrink: 1,
  },
  // Small uppercase section label, matching the leaderboard's info-card label.
  sectionTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    letterSpacing: 0.88,
    textTransform: 'uppercase',
    color: colors.neutral[600],
    paddingHorizontal: 6,
  },
});

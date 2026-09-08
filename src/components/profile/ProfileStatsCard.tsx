import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/src/components/ui/Card';
import { colors, spacing, typography } from '@/src/theme/theme';

interface ProfileStatsCardProps {
  /** Initial comes from this; falls back to "?" when the profile hasn't loaded. */
  name: string;
  /** Email or phone. Omit on screens where the identity line isn't wanted. */
  contact?: string;
  /** "#5 of 212 · up 2 this week", pre-composed by the caller. */
  rankLine: string;
  lifetimeDays: number;
  currentStreak: number;
  bestStreak: number;
  /**
   * Top-right slot: the Edit pill in settings, the flame streak pill on the
   * standing screen. A slot rather than a variant flag — the two have nothing in
   * common beyond their position.
   */
  accessory?: ReactNode;
}

/**
 * The profile identity + three-stat card, shared by the settings screen and the
 * leaderboard standing screen.
 *
 * These were two independent copies that had already drifted (square vs circular
 * avatar, tiles vs bare numbers under a rule, 18px vs 22px figures). They show the
 * same three numbers about the same person, so they are one component now and the
 * per-screen difference is confined to the `accessory` slot and `contact`.
 */
export function ProfileStatsCard({
  name,
  contact,
  rankLine,
  lifetimeDays,
  currentStreak,
  bestStreak,
  accessory,
}: ProfileStatsCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{(name || '?').charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.headerCol}>
          <Text style={styles.name} numberOfLines={1}>
            {name || 'You'}
          </Text>
          {contact ? (
            <Text style={styles.contactLine} numberOfLines={1}>
              {contact}
            </Text>
          ) : null}
          <Text style={styles.rankLine} numberOfLines={1}>
            {rankLine}
          </Text>
        </View>

        {/* Top-aligned so it tracks the name rather than centring against the
            whole name/contact/rank stack, and non-shrinking so a long name wraps
            instead of squeezing it. */}
        {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
      </View>

      <View style={styles.statsRow}>
        <StatTile value={lifetimeDays} label="lifetime days" />
        <StatTile value={currentStreak} label="current streak" />
        <StatTile value={bestStreak} label="best streak" />
      </View>
    </Card>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    // Rounded square, not a circle — same squircle family as the stat tiles
    // below it, scaled up for the larger box.
    borderRadius: 16,
    backgroundColor: colors.accent.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 24,
    color: colors.white,
  },
  headerCol: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.size.h4,
    color: colors.text,
  },
  contactLine: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.neutral[700],
  },
  rankLine: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.neutral[600],
  },
  accessory: {
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  // Three equal tiles rather than bare numbers over a rule: the tile groups each
  // figure with its label, which a shared top rule does not.
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statTile: {
    flex: 1,
    // 6px rather than 2px: at 22px vs 11px the two lines are far enough apart in
    // size that a hairline gap made them read as one clumped block.
    gap: 6,
    // Taller than it is padded horizontally, so the tile reads as a panel rather
    // than the wide letterbox a symmetric `spacing.md` gave it.
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    // Squarer than the app's `radii.sm` (14px) floor, matching the reference: at
    // this tile size a 14px+ radius rounds the corners enough to read as a pill
    // rather than a panel. One of the few deliberate departures from the radius
    // scale — see the radii note in theme.ts.
    borderRadius: 12,
    // Flat gray fill, no border. The outlined-white version disappeared into the
    // card behind it; a fill separates the tile from the card without a hairline.
    backgroundColor: colors.neutral[200],
  },
  statNumber: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 22,
    // Explicit, so the gap below is the whole story: left to itself the platform
    // adds its own leading here, which varies and eats into that spacing.
    lineHeight: 26,
    color: colors.text,
  },
  statLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    // `neutral[700]`, not the 600 used for secondary text on white: at 11px on
    // the tile's gray fill, 600 lands around 3.2:1 — under the 4.5:1 minimum.
    color: colors.neutral[700],
  },
});

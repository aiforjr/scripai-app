import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '@/src/theme/theme';

const BADGES: { threshold: number; label: string }[] = [
  { threshold: 3, label: 'First streak' },
  { threshold: 7, label: 'One week' },
  { threshold: 14, label: 'Two weeks' },
  { threshold: 30, label: 'Full month' },
];

/** 4-column badge-progress grid (screens-spec 1nc/1ma) — unlocked once `longestStreak` clears the threshold. */
export function BadgesRow({ longestStreak }: { longestStreak: number }) {
  return (
    <View style={styles.row}>
      {BADGES.map((badge) => {
        const unlocked = longestStreak >= badge.threshold;
        return (
          <View key={badge.threshold} style={[styles.tile, !unlocked && styles.tileLocked]}>
            <View style={[styles.circle, unlocked && styles.circleUnlocked]}>
              <Text style={[styles.number, unlocked && styles.numberUnlocked]}>
                {badge.threshold}
              </Text>
            </View>
            {/* Single line to match the design's nowrap; allowed to shrink a
                little rather than clip on narrow devices. */}
            <Text
              style={styles.label}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {badge.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  // Every tile is white with a card shadow; locked ones are dimmed as a whole
  // rather than tinted a different colour, so the row reads as one set.
  tile: {
    flex: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 6,
    ...shadows.card,
  },
  tileLocked: {
    opacity: 0.45,
  },
  // The threshold sits in a filled circle — accent once earned, grey until then.
  circle: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleUnlocked: {
    backgroundColor: colors.accent.DEFAULT,
  },
  number: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 15,
    color: colors.neutral[600],
  },
  numberUnlocked: {
    color: colors.white,
  },
  label: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 10,
    color: colors.text,
    textAlign: 'center',
  },
});

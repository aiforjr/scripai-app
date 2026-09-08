import { StyleSheet, View } from 'react-native';

import { FlameIcon } from '@/src/components/ui/icons';
import { colors, radii, shadows, spacing } from '@/src/theme/theme';

/**
 * The flame tile that heads every onboarding step. Extracted so the badge and
 * the spacing beneath it stay identical across the flow — the screens differ
 * only in their body content.
 *
 * `center` centres the tile: the onboarding steps run it left-aligned with
 * their body copy, while the paywall screens centre it under the header.
 */
export function OnboardingBadge({ center = false }: { center?: boolean }) {
  return (
    <View style={[styles.badge, center ? styles.centered : styles.leading]}>
      <FlameIcon size={40} color={colors.accent.DEFAULT} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 64,
    height: 64,
    borderRadius: radii.xl - 6,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  leading: {
    alignSelf: 'flex-start',
  },
  centered: {
    alignSelf: 'center',
  },
});

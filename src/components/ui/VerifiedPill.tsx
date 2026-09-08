import { StyleSheet, Text, View } from 'react-native';

import { CheckIcon } from '@/src/components/ui/icons';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

/**
 * The "Verified" pill on the profile phone row (1mb). The mockup tints it with the
 * accent ramp (accent-100 on accent-700) rather than using `colors.success` — the
 * badge reads as brand chrome there, not as a green success state.
 */
export function VerifiedPill({ label = 'Verified' }: { label?: string }) {
  return (
    <View style={styles.pill}>
      <CheckIcon size={12} color={colors.accent[700]} strokeWidth={3} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.accent[100],
  },
  text: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.size.xs,
    color: colors.accent[700],
  },
});

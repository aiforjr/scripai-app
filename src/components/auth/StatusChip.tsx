import { StyleSheet, Text, View } from 'react-native';

import { CheckIcon } from '@/src/components/ui/icons';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

/**
 * The accent-tinted "✓ Signed in with Apple" / "✓ Number verified" chip that heads
 * screens 1ci, 1cf, 1cl and 1cm. Self-aligning (`alignSelf: 'flex-start'`) so it
 * hugs its label instead of stretching across the column it sits in.
 */
export function StatusChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <CheckIcon size={13} color={colors.accent.DEFAULT} strokeWidth={3} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.accent[100],
  },
  label: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.accent[700],
  },
});

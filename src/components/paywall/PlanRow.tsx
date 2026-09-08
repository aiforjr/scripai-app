import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon } from '@/src/components/ui/icons';
import * as haptics from '@/src/lib/haptics';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

interface PlanRowProps {
  /** Plan name, e.g. "Yearly". */
  name: string;
  /** Term line under the name, e.g. "12 mo · $69.99". */
  term: string;
  /** Right-aligned price, e.g. "$5.83/mo". */
  price: string;
  selected: boolean;
  onPress: () => void;
}

/**
 * Plan selector row for the free-trial sheet (design `1pd`/`1qb`): selection
 * marker on the left, name over term in the middle, price on the right.
 *
 * Deliberately not `ui/RadioOption` — that one is label-left/dot-right for the
 * onboarding quizzes and has no price column.
 */
export function PlanRow({ name, term, price, selected, onPress }: PlanRowProps) {
  function handlePress() {
    haptics.select();
    onPress();
  }

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${name}, ${term}, ${price}`}
      onPress={handlePress}
      style={[styles.row, selected ? styles.rowSelected : styles.rowIdle]}
    >
      <View style={[styles.marker, selected && styles.markerSelected]}>
        {selected && <CheckIcon size={14} color={colors.white} strokeWidth={3.5} />}
      </View>

      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.term} numberOfLines={1}>
          {term}
        </Text>
      </View>

      <Text style={styles.price} numberOfLines={1}>
        {price}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: spacing.lg,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.white,
  },
  rowIdle: {
    borderWidth: 1,
    borderColor: colors.neutral[300],
  },
  rowSelected: {
    borderWidth: 2,
    borderColor: colors.accent.DEFAULT,
    shadowColor: colors.accent.DEFAULT,
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  marker: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.neutral[300],
  },
  markerSelected: {
    backgroundColor: colors.accent.DEFAULT,
    borderColor: colors.accent.DEFAULT,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.text,
  },
  term: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.neutral[600],
  },
  price: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 14,
    color: colors.neutral[700],
  },
});

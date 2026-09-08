import { Pressable, StyleSheet, Text, View } from 'react-native';

import * as haptics from '@/src/lib/haptics';
import { colors, radii, shadows, spacing, typography } from '@/src/theme/theme';

interface RadioOptionProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function RadioOption({ label, selected, onPress }: RadioOptionProps) {
  function handlePress() {
    haptics.select();
    onPress();
  }

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.row, shadows.card, selected && styles.rowSelected]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      <View style={[styles.dot, selected && styles.dotSelected]}>
        {selected && <View style={styles.dotInner} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 54,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
  },
  rowSelected: {
    borderWidth: 2,
    borderColor: colors.accent.DEFAULT,
  },
  label: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 15,
    color: colors.text,
  },
  labelSelected: {
    fontFamily: typography.fontFamily.semibold,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSelected: {
    borderWidth: 2,
    borderColor: colors.accent.DEFAULT,
  },
  dotInner: {
    width: 12,
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.accent.DEFAULT,
  },
});

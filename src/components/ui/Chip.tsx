import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CheckIcon } from '@/src/components/ui/icons';
import * as haptics from '@/src/lib/haptics';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  function handlePress() {
    haptics.select();
    onPress();
  }

  return (
    <Pressable onPress={handlePress} style={[styles.chip, selected && styles.chipSelected]}>
      {/*
        Both states carry a leading glyph of the same box — check when selected,
        `+` when not — so selecting never changes the chip's width. Swapping one
        for nothing would reflow the whole wrapping grid on `topics`.
      */}
      <View style={styles.glyph}>
        {selected ? (
          <CheckIcon size={14} color={colors.accent.DEFAULT} strokeWidth={3} />
        ) : (
          <Text style={styles.plus}>+</Text>
        )}
      </View>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    // Transparent in the resting state so the selected chip's accent ring adds
    // no width — an outline that appears on select would shift the grid.
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: {
    borderColor: colors.accent.DEFAULT,
  },
  glyph: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    lineHeight: 18,
    color: colors.neutral[500],
  },
  label: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 14,
    color: colors.neutral[700],
  },
  labelSelected: {
    color: colors.text,
  },
});

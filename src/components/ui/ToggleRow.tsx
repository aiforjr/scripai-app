import type { ReactNode } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';

import * as haptics from '@/src/lib/haptics';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

interface ToggleRowProps {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  /**
   * Optional leading glyph — the reminder-channel rows (1ma/1md) show a bell /
   * handset. It is rendered inside a 32px accent-tinted disc, so pass a bare 16px
   * glyph in `colors.accent[700]` and let the slot supply the circle.
   */
  icon?: ReactNode;
}

export function ToggleRow({
  label,
  subtitle,
  value,
  onValueChange,
  disabled,
  icon,
}: ToggleRowProps) {
  function handleValueChange(v: boolean) {
    haptics.select();
    onValueChange(v);
  }

  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      {icon ? <View style={styles.iconSlot}>{icon}</View> : null}
      <View style={styles.textCol}>
        <Text style={styles.label}>{label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={handleValueChange}
        disabled={disabled}
        // iOS only: tinting the track accent-red reads well against the platform's
        // white thumb. On Android the same props flatten Material's tinted thumb
        // into a solid red slab, so leave the stock switch alone there.
        {...(Platform.OS === 'ios'
          ? {
              trackColor: {
                false: colors.neutral[300],
                true: colors.accent.DEFAULT,
              },
              thumbColor: colors.white,
            }
          : null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  disabled: {
    opacity: 0.4,
  },
  // 32px accent-100 disc holding a 16px accent-700 glyph, per 1md. `flexShrink: 0`
  // mirrors the mockup's `flex:none` so a long label can never squash the circle.
  iconSlot: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.accent[100],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: 10,
  },
  textCol: {
    flex: 1,
    paddingRight: spacing.md,
    gap: 2,
  },
  label: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.text,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.neutral[600],
  },
});

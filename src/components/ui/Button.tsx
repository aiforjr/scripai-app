import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import * as haptics from '@/src/lib/haptics';
import { colors, radii, shadows, spacing, typography } from '@/src/theme/theme';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'white' | 'gold';
  style?: StyleProp<ViewStyle>;
  /**
   * Tap feedback weight. Defaults to `'medium'` — every Button in the app is a
   * primary action (Next, Save, Record, Start trial), so the heavier tap is the
   * right default; pass `'light'` for a Button used as a lesser affordance.
   */
  haptic?: 'medium' | 'light' | 'none';
}

export function Button({
  title,
  onPress,
  disabled,
  variant = 'primary',
  style,
  haptic = 'medium',
}: ButtonProps) {
  function handlePress() {
    if (haptic === 'medium') haptics.heavy();
    else if (haptic === 'light') haptics.tap();
    onPress?.();
  }

  return (
    <Pressable
      onPress={disabled ? undefined : handlePress}
      // `disabled` also drives the accessibility state so a gated Next reads as
      // dimmed *and* announces as disabled — the opacity alone says nothing to a
      // screen reader.
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'white' && styles.white,
        variant === 'gold' && styles.gold,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === 'primary' && styles.labelOnAccent,
          variant === 'gold' && styles.labelOnAccent,
          variant === 'white' && styles.labelOnWhite,
          variant === 'secondary' && styles.labelDefault,
          variant === 'ghost' && styles.labelGhost,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.accent.DEFAULT,
    ...shadows.button,
  },
  white: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  gold: {
    backgroundColor: colors.gold.button,
    shadowColor: colors.gold.dark,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.button,
  },
  labelOnAccent: {
    color: colors.white,
  },
  labelOnWhite: {
    color: colors.accent.DEFAULT,
  },
  labelDefault: {
    color: colors.text,
  },
  labelGhost: {
    color: colors.accent.DEFAULT,
  },
});

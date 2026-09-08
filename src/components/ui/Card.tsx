import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, shadows, spacing } from '@/src/theme/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
}

// Cards are white throughout the app. There used to be a `dark` variant, used
// only by the profile/standing cards on the settings and standing screens; both
// moved to white to match the rest of the surface treatment, which left the
// variant with no callers.
export function Card({ children, style, elevated = true }: CardProps) {
  return <View style={[styles.base, elevated && shadows.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});

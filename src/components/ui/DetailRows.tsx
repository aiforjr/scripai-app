import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { ChevronRight } from '@/src/components/ui/icons';
import { colors, radii, shadows, spacing, typography } from '@/src/theme/theme';

/**
 * The grouped-rows card used by settings 1mb/1mc: one white rounded card whose
 * children are separated by hairline dividers, with no divider trailing the last
 * row. Dividers live here rather than on each row so a row never has to know
 * whether it is last.
 */
export function DetailRows({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.card, style]}>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 ? <View style={styles.divider} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

interface DetailRowProps {
  label: string;
  /** Rendered instead of `value` — lets a row hold an input or a value + badge. */
  children?: ReactNode;
  value?: string;
  /** Makes the row tappable and shows the trailing chevron (1mb email/phone rows). */
  onPress?: () => void;
  /** Trailing content for status-style rows (linked accounts), replacing the chevron. */
  accessory?: ReactNode;
  muted?: boolean;
}

/** A single labelled row: 12px caption label above a 16px value. */
export function DetailRow({ label, children, value, onPress, accessory, muted }: DetailRowProps) {
  const body = (
    <>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {children ?? (
          <Text style={[styles.rowValue, muted && styles.rowValueMuted]} numberOfLines={1}>
            {value}
          </Text>
        )}
      </View>
      {accessory ?? (onPress ? <ChevronRight size={14} color={colors.neutral[500]} /> : null)}
    </>
  );

  if (!onPress) return <View style={styles.row}>{body}</View>;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {body}
    </Pressable>
  );
}

/** An icon + name row (1mb linked accounts) — no caption label, single-line. */
export function DetailIconRow({
  icon,
  label,
  accessory,
}: {
  icon: ReactNode;
  label: string;
  accessory: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.iconRowLeft}>
        {icon}
        <Text style={styles.iconRowLabel}>{label}</Text>
      </View>
      {accessory}
    </View>
  );
}

/** Uppercase letterspaced group heading, inset to align with the card's padding. */
export function DetailSectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    ...shadows.card,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.neutral[200],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 58,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowBody: {
    flex: 1,
    gap: spacing.xs,
  },
  rowLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.neutral[600],
  },
  rowValue: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.input,
    color: colors.text,
  },
  rowValueMuted: {
    color: colors.neutral[700],
  },
  iconRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconRowLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.text,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.neutral[600],
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
});

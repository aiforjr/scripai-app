import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';

import { CheckIcon, ChevronRight } from '@/src/components/ui/icons';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

/**
 * The grouped "Your details" card: one white panel holding several field rows
 * separated by hairline dividers, under a small caps section caption.
 *
 * This is a presentation variant of `FieldCard` — same three fields, same
 * editability rule (a row with no `onChangeText` is static text), same trailing
 * chevron for a value changed on another screen. The difference is purely that
 * the rows share one card instead of each getting their own, which is why this
 * is a separate component rather than a prop: `FieldCard`'s consumers on the
 * account-finishing screens keep the stacked-cards look.
 */
export function FieldGroup({ caption, children }: { caption?: string; children: ReactNode }) {
  // Dividers are drawn between rows rather than as a bottom border on each, so
  // the last row never leaves a hairline sitting on the card's rounded edge.
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={styles.group}>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      <View style={styles.card}>
        {rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {i > 0 ? <View style={styles.divider} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

interface FieldGroupRowProps {
  label: string;
  value: string;
  /** Omit to render read-only — the provider-supplied email and the phone row. */
  onChangeText?: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoFocus?: boolean;
  /** Renders the accent "Verified" pill after the value. */
  verified?: boolean;
  /** Greys the value — the "Not linked yet" email placeholder. */
  muted?: boolean;
  /** Makes the row tappable and adds a chevron, for a value changed elsewhere. */
  onPress?: () => void;
}

export function FieldGroupRow({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = 'sentences',
  autoFocus,
  verified,
  muted,
  onPress,
}: FieldGroupRowProps) {
  const editable = typeof onChangeText === 'function';

  const body = (
    <>
      <View style={styles.rowBody}>
        <Text style={styles.label}>{label}</Text>

        {editable ? (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.neutral[500]}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoFocus={autoFocus}
            autoCorrect={false}
          />
        ) : (
          // The badge sits inline after the value, so a long address pushes it
          // along rather than the two competing for the same right edge.
          <View style={styles.valueRow}>
            <Text style={[styles.value, muted && styles.valueMuted]} numberOfLines={1}>
              {value || placeholder}
            </Text>
            {verified ? <VerifiedPill /> : null}
          </View>
        )}
      </View>

      {onPress ? <ChevronRight size={16} color={colors.neutral[400]} /> : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{body}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {body}
    </Pressable>
  );
}

function VerifiedPill() {
  return (
    <View style={styles.pill}>
      {/* The drawn tick, not a "✓" character — the glyph varies by platform font
          and wouldn't match the stroke weight used elsewhere in the app. */}
      <CheckIcon size={12} color={colors.accent.DEFAULT} strokeWidth={3} />
      <Text style={styles.pillLabel}>Verified</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  caption: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    // Small-caps section header, per the grouped-list look.
    letterSpacing: 1,
    color: colors.neutral[600],
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xs,
  },
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowBody: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.neutral[600],
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    // Fixed height rather than intrinsic: without it the row's height shifts by
    // a pixel or two between platforms as the input measures its own line box.
    height: 24,
    padding: 0,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.input,
    color: colors.text,
  },
  value: {
    flexShrink: 1,
    height: 24,
    lineHeight: 24,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.input,
    color: colors.text,
  },
  valueMuted: {
    fontFamily: typography.fontFamily.regular,
    color: colors.neutral[500],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.accent[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  pillLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.accent.DEFAULT,
  },
});

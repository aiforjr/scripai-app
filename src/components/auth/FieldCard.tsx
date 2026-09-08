import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';

import { VerifiedCheck } from '@/src/components/ui/VerifiedCheck';
import { ChevronRight, LockIcon } from '@/src/components/ui/icons';
import * as haptics from '@/src/lib/haptics';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

type Accessory = 'none' | 'verified' | 'locked';

interface FieldCardProps {
  label: string;
  value: string;
  /** Omit to render read-only (the locked email on 1cm / 1ck, the info rows on 1ci). */
  onChangeText?: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoFocus?: boolean;
  /** Trailing status glyph: a green tick badge (verified) or a padlock (can't be edited). */
  accessory?: Accessory;
  /** Greys the value — the "Not linked yet" email placeholder on 1cf. */
  muted?: boolean;
  /**
   * Makes the whole card tappable and appends a chevron after the accessory — for
   * a value that is changed elsewhere rather than typed here (the phone row on the
   * finish screen, which has to re-run OTP to change).
   */
  onPress?: () => void;
}

/**
 * The white card holding a caption label above a 16px value, used for the
 * name/phone/email fields on the account-finishing screens (1ci, 1cf, 1cm, 1ck).
 *
 * This is a different shape from `TextField` (label *inside* the card rather than
 * above it, plus a trailing verified/locked glyph), which is why it isn't just a
 * prop on that component. Editability is driven by the presence of `onChangeText`:
 * a field with no handler renders as static text, so 1cm's provider-supplied email
 * can't be typed over even by an errant focus.
 *
 * Every card is white regardless of editability. Read-only rows used to sit on
 * `colors.surface`, which made the two provider-supplied fields look disabled next
 * to the editable name — they aren't disabled, they're confirmed, which is what the
 * tick and padlock say. The trailing glyph carries that distinction instead.
 */
export function FieldCard({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = 'sentences',
  autoFocus,
  accessory = 'none',
  muted,
  onPress,
}: FieldCardProps) {
  const editable = typeof onChangeText === 'function';

  const body = (
    <>
      <View style={styles.body}>
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
          <Text style={[styles.value, muted && styles.valueMuted]} numberOfLines={1}>
            {value || placeholder}
          </Text>
        )}
      </View>

      {accessory === 'verified' ? <VerifiedCheck /> : null}
      {accessory === 'locked' ? <LockIcon size={14} color={colors.neutral[500]} /> : null}
      {onPress ? <ChevronRight size={14} color={colors.neutral[500]} /> : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.card}>{body}</View>;
  }

  function handlePress() {
    haptics.select();
    onPress?.();
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  cardPressed: {
    opacity: 0.6,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.neutral[600],
  },
  input: {
    // Fixed height rather than intrinsic: without it the row's height shifts by a
    // pixel or two between platforms as the input measures its own line box.
    height: 24,
    padding: 0,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.input,
    color: colors.text,
  },
  value: {
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
});

import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/src/theme/theme';

const BOX_COUNT = 6;

interface OtpBoxesProps {
  code: string;
  onChangeCode: (code: string) => void;
  error?: boolean;
}

/**
 * 6-box OTP input. A single hidden TextInput drives the actual text state — tapping
 * anywhere on the boxes row focuses it, and each box just renders the matching digit.
 * The next-empty box gets a focus outline + caret; `error` paints every box red (1ce).
 */
export function OtpBoxes({ code, onChangeCode, error }: OtpBoxesProps) {
  const inputRef = useRef<TextInput>(null);
  const digits = code.split('');

  return (
    <Pressable style={styles.row} onPress={() => inputRef.current?.focus()}>
      {Array.from({ length: BOX_COUNT }).map((_, i) => {
        const digit = digits[i];
        const isNextEmpty = !error && i === code.length;
        return (
          <View
            key={i}
            style={[styles.box, isNextEmpty && styles.boxFocused, error && styles.boxError]}
          >
            {digit ? (
              <Text style={styles.digit}>{digit}</Text>
            ) : isNextEmpty ? (
              <View style={styles.caret} />
            ) : null}
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={(text) => onChangeCode(text.replace(/\D/g, '').slice(0, BOX_COUNT))}
        keyboardType="number-pad"
        maxLength={BOX_COUNT}
        autoFocus
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  box: {
    width: 46,
    height: 58,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFocused: {
    borderWidth: 2,
    borderColor: colors.accent.DEFAULT,
  },
  boxError: {
    borderWidth: 2,
    borderColor: colors.error,
  },
  digit: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.size.h4,
    color: colors.text,
  },
  caret: {
    width: 2,
    height: 24,
    backgroundColor: colors.accent.DEFAULT,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CountryCode } from 'libphonenumber-js';

import { CountryPickerModal } from '@/src/components/auth/CountryPickerModal';
import { findCountryOption, flagEmoji } from '@/src/lib/countries';
import * as haptics from '@/src/lib/haptics';
import { formatNationalInput } from '@/src/lib/phone';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

interface PhoneEntryRowProps {
  country: CountryCode;
  onChangeCountry: (country: CountryCode) => void;
  nationalNumber: string;
  onChangeNationalNumber: (digits: string) => void;
  autoFocus?: boolean;
  /**
   * Renders the country pill and number field as two page-gray inputs instead of
   * one white row — the shape 1mc needs, where the control sits inside a white
   * card and a white row would be invisible against it.
   */
  onSurface?: boolean;
}

/** Country dropdown (flag + calling code, searchable) + a formatted national-number field. */
export function PhoneEntryRow({
  country,
  onChangeCountry,
  nationalNumber,
  onChangeNationalNumber,
  autoFocus,
  onSurface,
}: PhoneEntryRowProps) {
  const [pickerVisible, setPickerVisible] = useState(false);

  const callingCode = useMemo(() => findCountryOption(country)?.callingCode ?? '', [country]);
  const displayValue = useMemo(
    () => formatNationalInput(country, nationalNumber),
    [country, nationalNumber],
  );

  return (
    <View style={[styles.row, onSurface && styles.rowOnSurface]}>
      <Pressable
        style={[styles.countryPill, onSurface && styles.countryPillOnSurface]}
        onPress={() => {
          haptics.select();
          setPickerVisible(true);
        }}
        hitSlop={8}
      >
        <Text style={styles.countryText}>
          {flagEmoji(country)} +{callingCode}
        </Text>
        <Text style={styles.caret}>⌄</Text>
      </Pressable>

      <CountryPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={onChangeCountry}
      />

      {onSurface ? null : <View style={styles.divider} />}
      <TextInput
        style={[styles.input, onSurface && styles.inputOnSurface]}
        value={displayValue}
        onChangeText={(text) => onChangeNationalNumber(text.replace(/\D/g, ''))}
        placeholder="Phone number"
        placeholderTextColor={colors.neutral[500]}
        keyboardType="phone-pad"
        autoFocus={autoFocus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
  },
  rowOnSurface: {
    height: 50,
    gap: 10,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: spacing.sm,
  },
  countryPillOnSurface: {
    height: '100%',
    paddingHorizontal: spacing.md,
    paddingRight: spacing.md,
    borderRadius: radii.md - 4,
    backgroundColor: colors.background,
  },
  countryText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.input,
    color: colors.text,
  },
  caret: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 26,
    backgroundColor: colors.divider,
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.input,
    color: colors.text,
  },
  inputOnSurface: {
    paddingHorizontal: 14,
    borderRadius: radii.md - 4,
    backgroundColor: colors.background,
    fontSize: typography.size.h4,
    letterSpacing: 0.6,
  },
});

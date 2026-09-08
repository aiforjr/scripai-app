import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { colors, radii, spacing, typography } from '@/src/theme/theme';

interface TextFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoFocus?: boolean;
  error?: string;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize = 'sentences',
  autoFocus,
  error,
}: TextFieldProps) {
  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, !!error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral[500]}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoFocus={autoFocus}
        autoCorrect={false}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.neutral[700],
    marginBottom: 5,
  },
  input: {
    height: 56,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.input,
    color: colors.text,
  },
  inputError: {
    borderWidth: 1.5,
    borderColor: colors.error,
  },
  error: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.error,
    marginTop: 6,
  },
});

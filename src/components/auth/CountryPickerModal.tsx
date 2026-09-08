import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CountryCode } from 'libphonenumber-js';

import { getAllCountryOptions, type CountryOption } from '@/src/lib/countries';
import * as haptics from '@/src/lib/haptics';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

interface CountryPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (cca2: CountryCode) => void;
}

export function CountryPickerModal({ visible, onClose, onSelect }: CountryPickerModalProps) {
  const [query, setQuery] = useState('');
  const allCountries = useMemo(() => getAllCountryOptions(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCountries;
    // Calling codes are stored without a leading '+' (e.g. '91'), but users
    // naturally type '+91' — strip it so that still matches.
    const qDigits = q.replace(/^\+/, '');
    return allCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (qDigits.length > 0 && c.callingCode.startsWith(qDigits)) ||
        c.cca2.toLowerCase() === q,
    );
  }, [allCountries, query]);

  function handleSelect(country: CountryOption) {
    haptics.select();
    onSelect(country.cca2);
    setQuery('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>Select country</Text>
            <Pressable
              onPress={() => {
                haptics.tap();
                onClose();
              }}
              hitSlop={8}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
          </View>

          <TextInput
            style={styles.search}
            value={query}
            onChangeText={setQuery}
            placeholder="Search country or code"
            placeholderTextColor={colors.neutral[500]}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.cca2}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => handleSelect(item)}>
                <Text style={styles.rowFlag}>{item.flag}</Text>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.rowCode}>+{item.callingCode}</Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No countries match “{query}”</Text>}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '85%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  title: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 17,
    color: colors.text,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 13,
    color: colors.neutral[700],
  },
  search: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    height: 46,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    fontFamily: typography.fontFamily.regular,
    fontSize: 15,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  rowFlag: {
    fontSize: 22,
  },
  rowName: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: 15,
    color: colors.text,
  },
  rowCode: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 14,
    color: colors.neutral[600],
  },
  emptyText: {
    textAlign: 'center',
    marginTop: spacing.xl,
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.neutral[600],
  },
});

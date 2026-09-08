import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { CountryCode } from 'libphonenumber-js';

import { PhoneEntryRow } from '@/src/components/auth/PhoneEntryRow';
import { Button } from '@/src/components/ui/Button';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import {
  detectDefaultCountry,
  formatE164ForDisplay,
  isValidNationalNumber,
  toE164,
} from '@/src/lib/phone';
import * as haptics from '@/src/lib/haptics';
import { isMockPhone } from '@/src/lib/phone-mock';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radii, shadows, spacing, typography } from '@/src/theme/theme';

export default function ChangePhone() {
  const router = useRouter();
  const { profile } = useAuth();
  const [country, setCountry] = useState<CountryCode>(detectDefaultCountry);
  const [nationalNumber, setNationalNumber] = useState('');
  const [sending, setSending] = useState(false);

  // 1mc's input is a country dropdown + national number, so the number has to be
  // recomposed to E.164 before it goes anywhere near Supabase.
  const canSend = isValidNationalNumber(country, nationalNumber);

  const handleSendOtp = async () => {
    const e164 = toE164(country, nationalNumber);
    if (!e164 || sending) return;
    setSending(true);

    // The demo number skips the send and goes straight to the code screen, which
    // accepts its fixed OTP — same bypass the signup flow uses.
    if (isMockPhone(e164)) {
      setSending(false);
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone: e164, mode: 'settings-change' },
      });
      return;
    }

    const { error } = await supabase.auth.updateUser({ phone: e164 });
    setSending(false);
    if (error) {
      haptics.error();
      Alert.alert('Something went wrong', error.message);
      return;
    }
    // Hands off to the shared OTP screen rather than just alerting: `updateUser`
    // only *sends* the code, and the number isn't actually moved until
    // `verifyOtp({type: 'phone_change'})` confirms it. `settings-change` mode
    // returns the user here instead of into the signup flow.
    router.push({
      pathname: '/(auth)/verify-otp',
      params: { phone: e164, mode: 'settings-change' },
    });
  };

  return (
    <View style={styles.container}>
      {/* ScreenHeader owns the top inset (white bar carrying up behind the status
          bar, per 1mc) and the tab bar already covers the bottom inset — so this
          screen adds no safe-area padding of its own. A SafeAreaView here would
          add the bottom inset a second time and leave a white gap under the
          footer button. */}
      <ScreenHeader title="Change phone number" showBack />

      <View style={styles.body}>
        {/* Read-only current number. A plain card rather than a DetailRows group: 1mc
            renders this as one padded block (14px/16px, 4px gap), and the list-row
            sizing DetailRow carries made it taller than the input card below it. */}
        <View style={styles.currentCard}>
          <Text style={styles.cardLabel}>Current number</Text>
          <Text style={styles.currentValue}>
            {formatE164ForDisplay(profile?.phone) ?? 'Not set'}
          </Text>
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.cardLabel}>New phone number</Text>
          <PhoneEntryRow
            country={country}
            onChangeCountry={setCountry}
            nationalNumber={nationalNumber}
            onChangeNationalNumber={setNationalNumber}
            onSurface
          />
        </View>

        <View style={styles.callout}>
          <Text style={styles.calloutText}>
            We&apos;ll text an OTP to the new number. Reminders and AI calls move over once
            it&apos;s verified.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title={sending ? 'Sending…' : 'Send OTP'}
          onPress={handleSendOtp}
          disabled={sending || !canSend}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // White so the header bar's colour carries up behind the status bar; the
    // body below paints itself page-gray.
    flex: 1,
    backgroundColor: colors.white,
  },
  body: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  currentCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    ...shadows.card,
  },
  // Muted per 1mc — this number is context for the change, not the field being edited.
  currentValue: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.input,
    color: colors.neutral[700],
  },
  inputCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: 18,
    gap: spacing.sm,
    ...shadows.card,
  },
  // Shared by both cards' captions — 12px semibold neutral-600.
  cardLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.neutral[600],
  },
  // Accent-tinted advisory block per 1mc — not an error, so it uses the accent
  // ramp's lightest tint rather than `colors.error`.
  callout: {
    backgroundColor: colors.accent[100],
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  calloutText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.accent[800],
  },
  footer: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
});

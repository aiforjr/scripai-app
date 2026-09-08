import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CountryCode } from 'libphonenumber-js';

import { PhoneEntryRow } from '@/src/components/auth/PhoneEntryRow';
import { SocialAuthButtons } from '@/src/components/auth/SocialAuthButtons';
import { Button } from '@/src/components/ui/Button';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { StepHeader } from '@/src/components/ui/StepHeader';
import { detectDefaultCountry, isValidNationalNumber, toE164 } from '@/src/lib/phone';
import { supabase } from '@/src/lib/supabase';
import { colors, spacing, typography } from '@/src/theme/theme';

// Design (1ch) shows a "recognised device" card with a one-tap "Continue as {name}"
// for a remembered prior user. We deliberately skip that here: this screen is only
// ever reached when there's no active session (root `/` redirects straight to home
// whenever a session already exists), so there's no real persisted "last known user"
// to show without faking it — we go straight to the phone-entry state (1cb).
export default function Login() {
  const router = useRouter();
  const [country, setCountry] = useState<CountryCode>(detectDefaultCountry());
  const [rawDigits, setRawDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isValid = isValidNationalNumber(country, rawDigits);

  function onChangeDigits(digits: string) {
    setRawDigits(digits);
    if (error) setError(null);
  }

  async function handleSendOtp() {
    const phone = toE164(country, rawDigits);
    if (!isValid || !phone) return;
    setError(null);
    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    router.push({ pathname: '/(auth)/verify-otp', params: { phone, mode: 'login' } });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ProgressBar progress={0.67} />
      <StepHeader />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.subhead}>Enter your number and we'll text you an OTP.</Text>

        <PhoneEntryRow
          country={country}
          onChangeCountry={setCountry}
          nationalNumber={rawDigits}
          onChangeNationalNumber={onChangeDigits}
          autoFocus
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.finePrint}>
          By continuing, you agree to receive SMS messages from ScripAI for phone verification.
        </Text>

        <Button
          title={loading ? 'Sending…' : 'Send OTP'}
          variant="primary"
          disabled={!isValid || loading}
          onPress={handleSendOtp}
          style={styles.sendButton}
        />

        <SocialAuthButtons />

        <Pressable
          style={styles.emailLink}
          onPress={() => router.push('/(auth)/login-email')}
          hitSlop={8}
        >
          <Text style={styles.emailLinkText}>Continue with email instead</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  heading: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.size.h2,
    color: colors.text,
    letterSpacing: -0.4,
  },
  subhead: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.neutral[700],
    marginBottom: spacing.sm,
  },
  errorText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.accent[700],
  },
  finePrint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.neutral[600],
    lineHeight: 16,
  },
  sendButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  emailLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emailLinkText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.body,
    color: colors.accent.DEFAULT,
  },
});

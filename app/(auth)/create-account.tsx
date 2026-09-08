import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CountryCode } from 'libphonenumber-js';

import { PhoneEntryRow } from '@/src/components/auth/PhoneEntryRow';
import { ProviderSignInSheet } from '@/src/components/auth/ProviderSignInSheet';
import { SocialAuthButtons } from '@/src/components/auth/SocialAuthButtons';
import { Button } from '@/src/components/ui/Button';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { StepHeader } from '@/src/components/ui/StepHeader';
import type { OAuthIdentity, OAuthProvider } from '@/src/lib/oauth-mock';
import { detectDefaultCountry, isValidNationalNumber, toE164 } from '@/src/lib/phone';
import { isMockPhone } from '@/src/lib/phone-mock';
import { supabase } from '@/src/lib/supabase';
import { useOnboardingDraft } from '@/src/providers/OnboardingDraftProvider';
import { useSignupDraft } from '@/src/providers/SignupDraftProvider';
import { colors, spacing, typography } from '@/src/theme/theme';

// The fork at the top of account creation. Covers 1ca (empty/disabled), 1cb′
// (valid/enabled) and 1cc (inline error) as one component — the visual state just
// follows `rawDigits` + `error` — and opens the provider sheet (1cg) for the
// OAuth-first branch.
export default function CreateAccount() {
  const router = useRouter();
  const { draft } = useOnboardingDraft();
  const { signup, setIdentity, setFullName } = useSignupDraft();
  const [country, setCountry] = useState<CountryCode>(detectDefaultCountry());
  const [rawDigits, setRawDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sheetProvider, setSheetProvider] = useState<OAuthProvider | null>(null);

  const isValid = isValidNationalNumber(country, rawDigits);

  // The quiz already asked for a name ((onboarding)/name), so carry it into the
  // signup draft rather than making 1cf/1cm ask a second time. Seeding once on
  // entry to the flow — and only when the draft is still empty — keeps a back-swipe
  // to this screen from overwriting a name edited later on.
  useEffect(() => {
    if (!signup.fullName && draft.fullName) setFullName(draft.fullName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAuthorized(identity: OAuthIdentity) {
    setIdentity(identity);
    setSheetProvider(null);
    // Both providers go straight to the phone step. The mockups gave Google its own
    // "Confirm your email" screen (1cg3) first, but 1ci already shows the linked
    // address and — since its Email row re-opens the provider sheet — already *is*
    // the confirm-or-switch affordance. A dedicated screen would ask the same
    // question twice, so the two providers now share one path.
    router.push('/(auth)/add-phone');
  }

  function onChangeDigits(digits: string) {
    setRawDigits(digits);
    if (error) setError(null);
  }

  async function handleSendOtp() {
    const phone = toE164(country, rawDigits);
    if (!isValid || !phone) {
      setError("That doesn't look like a full number. Check and try again.");
      return;
    }
    setError(null);
    setLoading(true);

    // The demo number sends nothing — it accepts a fixed code on the next screen.
    if (isMockPhone(phone)) {
      setLoading(false);
      router.push({ pathname: '/(auth)/verify-otp', params: { phone, mode: 'signup' } });
      return;
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    router.push({ pathname: '/(auth)/verify-otp', params: { phone, mode: 'signup' } });
  }

  const progress = sheetProvider ? 0.4 : 0.2;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 1ca sits at 20%; opening the provider sheet is 1cg, which the spec puts at 40%. */}
      <ProgressBar progress={progress} />
      <StepHeader />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Continue account setup</Text>
        <Text style={styles.subhead}>Enter your number to creates your account.</Text>

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

        <SocialAuthButtons onSelect={setSheetProvider} disabled={loading} />

        <Text style={styles.legalText}>
          By continuing you agree to our <Text style={styles.legalLink}>Terms</Text> and{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>.
        </Text>
      </ScrollView>

      <ProviderSignInSheet
        provider={sheetProvider}
        onCancel={() => setSheetProvider(null)}
        onAuthorized={handleAuthorized}
      />
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
  legalText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.neutral[600],
    textAlign: 'center',
    marginTop: spacing.md,
  },
  legalLink: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.neutral[800],
  },
});

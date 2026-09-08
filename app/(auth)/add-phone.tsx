import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CountryCode } from 'libphonenumber-js';

import { PhoneEntryRow } from '@/src/components/auth/PhoneEntryRow';
import { ProviderSignInSheet } from '@/src/components/auth/ProviderSignInSheet';
import { StatusChip } from '@/src/components/auth/StatusChip';
import { Button } from '@/src/components/ui/Button';
import { DetailRow, DetailRows } from '@/src/components/ui/DetailRows';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { StepHeader } from '@/src/components/ui/StepHeader';
import { PROVIDER_LABEL, type OAuthProvider } from '@/src/lib/oauth-mock';
import { detectDefaultCountry, isValidNationalNumber, parseE164, toE164 } from '@/src/lib/phone';
import { isMockPhone } from '@/src/lib/phone-mock';
import { supabase } from '@/src/lib/supabase';
import { useSignupDraft } from '@/src/providers/SignupDraftProvider';
import { colors, spacing, typography } from '@/src/theme/theme';

/**
 * 1ci — "Add your phone number". Serves two callers, keyed off `mode`:
 *
 *  - **The OAuth branch's phone step** (no `mode`). Name and email are already
 *    known, so they sit in a read-only card above the number field — and because
 *    the Email row re-opens the provider sheet, that card doubles as the
 *    confirm-or-switch step the mockups gave Google its own screen (1cg3) for.
 *    The phone is not optional even though the account could exist on the provider
 *    identity alone: the daily reminder and the AI call both need a number.
 *
 *  - **The finish screen's change-number detour** (`mode: 'change'`, plus the
 *    current number as `phone` to prefill). A session already exists by then, which
 *    changes both the copy and which Supabase call sends the code — see
 *    `handleSendOtp`. Reachable from either branch, so a linked email is optional
 *    here in a way it never is on the first pass.
 */
export default function AddPhone() {
  const router = useRouter();
  const { phone: prefill, mode } = useLocalSearchParams<{ phone?: string; mode?: string }>();
  const { signup, setIdentity } = useSignupDraft();
  const identity = signup.identity;

  // `mode: 'change'` means the finish screen sent the user back to swap an already
  // verified number, so the copy asks for a new one rather than a first one.
  const isChanging = mode === 'change';
  const prefilled = useMemo(() => (prefill ? parseE164(prefill) : null), [prefill]);

  const [country, setCountry] = useState<CountryCode>(prefilled?.country ?? detectDefaultCountry());
  const [rawDigits, setRawDigits] = useState(prefilled?.nationalNumber ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sheetProvider, setSheetProvider] = useState<OAuthProvider | null>(null);

  // On the first pass this screen only exists as the OAuth branch's phone step, so
  // no identity means it was reached out of order (a cold deep-link, or a back-swipe
  // that unwound past the fork). The change-number pass is exempt: a phone-first
  // user who hasn't linked an email yet still has to be able to fix their number.
  //
  // Decided once, on mount, rather than tracking `identity` live. This screen stays
  // mounted underneath `finish-account`, which `reset()`s the draft the moment the
  // account is created — re-reading `identity` after that would read the clear as a
  // cold entry and `replace` out from under the navigation to the paywall.
  const enteredWithIdentity = useRef(!!identity).current;

  useEffect(() => {
    if (!enteredWithIdentity && !isChanging) router.replace('/(auth)/create-account');
  }, [enteredWithIdentity, isChanging, router]);

  const isValid = isValidNationalNumber(country, rawDigits);

  async function handleSendOtp() {
    const phone = toE164(country, rawDigits);
    if (!isValid || !phone || loading) {
      setError("That doesn't look like a full number. Check and try again.");
      return;
    }
    setError(null);
    setLoading(true);

    // The demo number sends nothing — it accepts a fixed code on the next screen.
    if (isMockPhone(phone)) {
      setLoading(false);
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phone, mode: isChanging ? 'phone-change' : 'signup' },
      });
      return;
    }

    // Two different Supabase calls, because by the "change" pass a session already
    // exists. `signInWithOtp` on a number that isn't the session's would start a
    // *separate* account rather than move this one, so an authenticated change goes
    // through `updateUser`, which sends its own confirmation code.
    const { error: otpError } = isChanging
      ? await supabase.auth.updateUser({ phone })
      : await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (otpError) {
      setError(otpError.message);
      return;
    }
    router.push({
      pathname: '/(auth)/verify-otp',
      params: { phone, mode: isChanging ? 'phone-change' : 'signup' },
    });
  }

  // The guard above is already redirecting in this case; render nothing meanwhile.
  // A change-number pass with no linked email is legitimate and falls through.
  if (!enteredWithIdentity && !isChanging) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Coming back to change a number is a detour from the last step, not a step
          of its own, so the bar stays where the finish screen left it. */}
      <ProgressBar progress={isChanging ? 1 : 0.6} />
      <StepHeader />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {identity ? (
          <StatusChip label={`Signed in with ${PROVIDER_LABEL[identity.provider]}`} />
        ) : null}

        <Text style={styles.heading}>
          {isChanging ? 'Change your number' : 'Add your phone number'}
        </Text>
        <Text style={styles.subhead}>
          {isChanging
            ? "Enter the new number. We'll text an OTP to confirm it before it replaces the old one."
            : "Reminders and AI calls need it. We'll text an OTP to confirm."}
        </Text>

        {/* Absent on a change-number pass that arrived from the phone-first branch,
            where no provider has been linked yet and there is nothing to confirm. */}
        {identity ? (
          <DetailRows>
            <DetailRow label="Name" value={signup.fullName} />
            {/* On the first pass this row is the confirm-or-switch step: it shows the
                address the provider shared, and tapping it re-opens that provider's
                sheet so a different account can be picked — which is why there is no
                separate confirmation screen (the mockups' 1cg3 folded into this row).
                On a change-number pass it goes inert, chevron and all: the user came
                here to edit one field, and the email is shown only as context for
                whose account this is. Changing it stays available on the finish
                screen, where it belongs. */}
            <DetailRow
              label="Email"
              value={identity.email}
              onPress={isChanging ? undefined : () => setSheetProvider(identity.provider)}
            />
          </DetailRows>
        ) : null}

        <View style={styles.phoneBlock}>
          <PhoneEntryRow
            country={country}
            onChangeCountry={setCountry}
            nationalNumber={rawDigits}
            onChangeNationalNumber={(digits) => {
              setRawDigits(digits);
              if (error) setError(null);
            }}
            autoFocus
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.finePrint}>
            By continuing, you agree to receive SMS messages from ScripAI for phone verification.
          </Text>
        </View>
      </ScrollView>

      <Button
        title={loading ? 'Sending…' : 'Send OTP'}
        variant="primary"
        disabled={!isValid || loading}
        onPress={handleSendOtp}
      />

      <ProviderSignInSheet
        provider={sheetProvider}
        onCancel={() => setSheetProvider(null)}
        onAuthorized={(next) => {
          setIdentity(next);
          setSheetProvider(null);
        }}
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
    marginTop: spacing.sm,
  },
  subhead: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.neutral[700],
    marginTop: -spacing.sm,
    lineHeight: 21,
  },
  phoneBlock: {
    gap: spacing.md,
    marginTop: spacing.sm,
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
});

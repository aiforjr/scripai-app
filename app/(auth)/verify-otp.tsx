import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OtpBoxes } from '@/src/components/auth/OtpBoxes';
import { StatusChip } from '@/src/components/auth/StatusChip';
import { Button } from '@/src/components/ui/Button';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { StepHeader } from '@/src/components/ui/StepHeader';
import * as haptics from '@/src/lib/haptics';
import { PROVIDER_LABEL } from '@/src/lib/oauth-mock';
import { formatE164ForDisplay } from '@/src/lib/phone';
import { isMockOtp, isMockPhone, signInToMockAccount } from '@/src/lib/phone-mock';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { useSignupDraft } from '@/src/providers/SignupDraftProvider';
import { colors, spacing, typography } from '@/src/theme/theme';

const RESEND_SECONDS = 42;
const MAX_ATTEMPTS = 3;

// Covers 1cd / 1cd′ / 1cd″ (fresh OTP entry, resend countdown), 1ce (wrong-code
// error state, boxes turn red, attempts-left counter) and 1cl (the same screen
// reached from the OAuth branch, which adds the "Signed in with X" chip) as one
// component.
export default function VerifyOtp() {
  const router = useRouter();
  const { phone, mode } = useLocalSearchParams<{ phone: string; mode: string }>();
  const { signup, setPhone } = useSignupDraft();
  const { refreshProfile, user } = useAuth();

  // Four callers, differing in which Supabase call confirms the code and where the
  // user lands afterwards:
  //   'signup'          — either branch's first verification → finish screen
  //   'phone-change'    — the finish screen's change-number detour → finish screen
  //   'settings-change' — settings' change-phone screen → back to settings
  //   'login'           — returning user → root
  // The two change modes share `phone_change` verification (a session already
  // exists); they differ only in destination.
  const isSettingsChange = mode === 'settings-change';
  const isPhoneChange = mode === 'phone-change' || isSettingsChange;
  const isSignupFlow = mode === 'signup' || mode === 'phone-change';
  // The demo number skipped the SMS send, so it is verified locally instead.
  const isMock = isMockPhone(phone);

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [otpError, setOtpError] = useState(false);
  // Set only when the demo account's sign-in itself fails (project misconfigured,
  // network down). Distinct from `otpError`'s "wrong code" copy, which would be a
  // misleading thing to show when the code was in fact correct.
  const [demoError, setDemoError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const submittedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft > 0]);

  function onChangeCode(next: string) {
    setCode(next);
    if (otpError) setOtpError(false);
    if (demoError) setDemoError(null);
  }

  async function handleVerify(codeToVerify: string) {
    if (codeToVerify.length !== 6 || verifying) return;
    submittedCodeRef.current = codeToVerify;
    setVerifying(true);

    if (isMock) {
      // The demo number never reached Twilio, so there is no code on the server to
      // check — the fixed one is compared locally. A wrong code still fails, and
      // still burns an attempt, so the error states stay demoable.
      if (!isMockOtp(codeToVerify)) {
        setVerifying(false);
        haptics.error();
        setOtpError(true);
        setAttemptsLeft((prev) => Math.max(0, prev - 1));
        return;
      }

      // The settings change-phone pass already has a session; the signup passes
      // need one minted here, since the demo number can't get one from `verifyOtp`.
      // Without it every RLS-scoped write later in the flow is silently dropped.
      if (!isSettingsChange) {
        try {
          await signInToMockAccount();
        } catch (e) {
          setVerifying(false);
          haptics.error();
          setOtpError(true);
          setDemoError(e instanceof Error ? e.message : 'Demo sign-in failed.');
          return;
        }
      }

      setVerifying(false);
      await finishVerification();
      return;
    }

    // A number changed from inside an existing session is confirmed as a
    // `phone_change`, not an `sms` sign-in — the latter would resolve to a
    // different account rather than moving this one's number.
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: codeToVerify,
      type: isPhoneChange ? 'phone_change' : 'sms',
    });
    setVerifying(false);

    if (error) {
      haptics.error();
      setOtpError(true);
      setAttemptsLeft((prev) => Math.max(0, prev - 1));
      return;
    }

    await finishVerification();
  }

  async function finishVerification() {
    // Fired here, not in the 6-digit auto-submit effect: that effect re-runs on
    // every keystroke and would buzz per digit. `submittedCodeRef` already keeps
    // the verify itself from re-entering.
    haptics.success();

    if (isSettingsChange) {
      // Already a full account — the number is simply confirmed and the user drops
      // back to the settings screen they started from. For a real number the
      // phone-sync trigger has already mirrored the new value into `profiles`; the
      // demo number never touched `auth.users`, so it is written directly here.
      // Either way `refreshProfile` is what makes settings show the new number.
      if (isMock && user) {
        await supabase.from('profiles').update({ phone }).eq('id', user.id);
      }
      await refreshProfile();
      router.dismissTo('/(tabs)/settings');
      return;
    }

    if (isSignupFlow) {
      // The session now exists, but the account isn't finished: 1cf/1cm still need
      // a name, and — on the phone-first branch — an email to link. Both drafts are
      // flushed together there, so nothing is written to `profiles` yet.
      setPhone(phone);
      // `dismissTo` rather than `replace`: when this OTP round came from the finish
      // screen's "change number" detour, that screen is already on the stack below,
      // and replacing would leave a second copy of it above the detour's
      // `add-phone`. `dismissTo` pops back to the existing one instead, and on the
      // first pass through signup — where there is nothing to pop to — it falls back
      // to replacing this screen, which is exactly what that case wants.
      router.dismissTo('/(auth)/finish-account');
    } else {
      router.replace('/');
    }
  }

  useEffect(() => {
    if (code.length === 6 && submittedCodeRef.current !== code) {
      handleVerify(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function handleResend() {
    if (secondsLeft > 0 || resending) return;
    haptics.tap();
    setResending(true);
    // Mirrors `handleVerify`'s split. The demo number is skipped entirely — there is
    // nothing to re-send, so this just restarts the timer — and re-issuing a
    // phone-change code means calling `updateUser` again, not a fresh sign-in.
    if (!isMock) {
      if (isPhoneChange) await supabase.auth.updateUser({ phone });
      else await supabase.auth.signInWithOtp({ phone });
    }
    setResending(false);
    setSecondsLeft(RESEND_SECONDS);
    setCode('');
    setOtpError(false);
    setAttemptsLeft(MAX_ATTEMPTS);
    submittedCodeRef.current = null;
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const countdownLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 1cd sits at 100%; the OAuth branch reaches the same screen one step earlier
          (1cl), which the spec puts at 80%. */}
      <ProgressBar progress={signup.identity ? 0.8 : 1} />
      <StepHeader />

      <View style={styles.content}>
        {signup.identity ? (
          <StatusChip label={`Signed in with ${PROVIDER_LABEL[signup.identity.provider]}`} />
        ) : null}

        <Text style={styles.heading}>Enter the OTP</Text>
        <View style={styles.subheadBlock}>
          <Text style={styles.subhead}>
            We texted a 6-digit OTP to{' '}
            <Text style={styles.phoneText}>{formatE164ForDisplay(phone) ?? phone}</Text>.
          </Text>
          {/* 1ce drops this link: once a code has been rejected the error text and
              resend affordance own that space, and the spec shows no "Wrong number?"
              row there. */}
          {otpError ? null : (
            <Pressable
              onPress={() => {
                haptics.tap();
                router.back();
              }}
              hitSlop={8}
            >
              <Text style={styles.wrongNumberLink}>Wrong number?</Text>
            </Pressable>
          )}
        </View>

        <OtpBoxes code={code} onChangeCode={onChangeCode} error={otpError} />

        {/* A demo sign-in failure takes precedence: the code *was* right, so the
            attempts-left copy below would be actively misleading. */}
        {demoError ? (
          <Text style={styles.errorText}>{demoError}</Text>
        ) : otpError ? (
          <Text style={styles.errorText}>
            That OTP isn't right. {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} left.
          </Text>
        ) : null}

        {secondsLeft > 0 ? (
          <Text style={styles.countdown}>
            Resend OTP in <Text style={styles.countdownEmphasis}>{countdownLabel}</Text>
          </Text>
        ) : (
          <Pressable onPress={handleResend} hitSlop={8}>
            <Text style={styles.resendLink}>{resending ? 'Resending…' : 'Resend OTP'}</Text>
          </Pressable>
        )}
      </View>

      <Button
        title={verifying ? 'Verifying…' : 'Verify OTP'}
        variant="primary"
        disabled={code.length !== 6 || verifying}
        onPress={() => handleVerify(code)}
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
    flex: 1,
    gap: spacing.lg,
  },
  heading: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.size.h2,
    color: colors.text,
    letterSpacing: -0.4,
  },
  subheadBlock: {
    gap: spacing.xs,
    marginTop: -spacing.sm,
  },
  subhead: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.neutral[700],
  },
  wrongNumberLink: {
    alignSelf: 'flex-start',
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.body,
    color: colors.accent.DEFAULT,
  },
  phoneText: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.text,
  },
  errorText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.accent[700],
    marginTop: -spacing.sm,
  },
  countdown: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.neutral[700],
  },
  countdownEmphasis: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.text,
  },
  resendLink: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.body,
    color: colors.accent.DEFAULT,
  },
});

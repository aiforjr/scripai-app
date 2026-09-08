import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FieldCard } from '@/src/components/auth/FieldCard';
import { ProviderSignInSheet } from '@/src/components/auth/ProviderSignInSheet';
import { SocialAuthButtons } from '@/src/components/auth/SocialAuthButtons';
import { StatusChip } from '@/src/components/auth/StatusChip';
import { Button } from '@/src/components/ui/Button';
import { DetailIconRow, DetailRows } from '@/src/components/ui/DetailRows';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { StepHeader } from '@/src/components/ui/StepHeader';
import { AppleIcon, ChevronRight, GoogleIcon } from '@/src/components/ui/icons';
import {
  PROVIDER_EMAIL_SOURCE,
  PROVIDER_LABEL,
  type OAuthIdentity,
  type OAuthProvider,
} from '@/src/lib/oauth-mock';
import * as haptics from '@/src/lib/haptics';
import { formatE164ForDisplay } from '@/src/lib/phone';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { useOnboardingDraft } from '@/src/providers/OnboardingDraftProvider';
import { useSignupDraft } from '@/src/providers/SignupDraftProvider';
import { colors, spacing, typography } from '@/src/theme/theme';

/**
 * "Finish your account" — where both branches of account creation converge, and the
 * only place `profiles` is written during signup.
 *
 * One screen covers three mockups because they differ only in whether an email is
 * linked yet:
 *  - 1cf — phone-first, nothing linked: email reads "Not linked yet" and the
 *    Apple/Gmail buttons are the way to fill it. Done stays disabled until one is used.
 *  - 1ck — phone-first, just linked: the field fills, locks, and the buttons are
 *    replaced by the "linked with" row.
 *  - 1cm — OAuth-first: identical to 1ck on arrival, since the provider was linked
 *    back at 1cg.
 *
 * The email is never typed. Both flows make it provider-supplied so the address on
 * file is always one the user has actually proved they control.
 */
export default function FinishAccount() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const { commit } = useOnboardingDraft();
  const { signup, setIdentity, setFullName, reset } = useSignupDraft();

  const [sheetProvider, setSheetProvider] = useState<OAuthProvider | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only reachable with a verified number — the OTP screen sets it. Without one the
  // "Number verified" chip would be a lie and there'd be nothing to save, so a cold
  // entry goes back to the start of the flow. Skipped while `handleDone` is in
  // flight: it clears the draft on success, and this must not read that as a cold
  // entry and redirect out from under the navigation to the paywall.
  useEffect(() => {
    if (!signup.phone && !saving) router.replace('/(auth)/create-account');
  }, [signup.phone, saving, router]);

  const identity = signup.identity;
  const displayPhone = formatE164ForDisplay(signup.phone) ?? signup.phone ?? '';
  // A linked email isn't a dead end: "Change" reopens the same provider's sheet to
  // pick a different account there, and this switches provider outright. Both just
  // reopen the sheet — `setIdentity` overwrites whatever was linked before, so
  // there is no separate unlink step to get wrong.
  const otherProvider: OAuthProvider = identity?.provider === 'google' ? 'apple' : 'google';
  // 1cf draws "Link email" disabled: with nothing linked there is no email to save,
  // and the Apple/Gmail buttons below are the affordance that unblocks it. The
  // button only becomes the live "Done" of 1ck/1cm once a provider has been linked.
  const canFinish = signup.fullName.trim().length > 0 && !!identity && !saving;

  function handleAuthorized(next: OAuthIdentity) {
    setIdentity(next);
    setSheetProvider(null);
  }

  /**
   * Sends the user back to re-enter and re-verify their number. The draft's phone
   * is deliberately left in place: it seeds the entry field, and clearing it here
   * would trip the cold-entry guard above before the navigation lands. It is
   * overwritten by `verify-otp` once a new number actually passes.
   */
  function handleChangePhone() {
    router.push({
      pathname: '/(auth)/add-phone',
      params: { phone: signup.phone ?? '', mode: 'change' },
    });
  }

  async function handleDone() {
    if (!canFinish || !identity) return;
    setError(null);
    setSaving(true);

    // No demo-number special case here any more. The bypass signs into a real
    // account back on the OTP screen (`signInToMockAccount`), so there is a genuine
    // `auth.uid()` by now and every write below applies — which is what lets the
    // demo run exercise the authenticated app instead of landing on an empty
    // profile with silently-dropped writes.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError('Your session expired. Go back and verify your number again.');
      return;
    }

    // Two writes, in this order on purpose. `commit()` flushes the quiz answers and
    // sets `onboarding_complete` (what un-gates the tabs) but writes the *quiz's*
    // name; the second update then lands what was gathered here, so a name edited
    // on this screen wins over the one typed back in onboarding.
    //
    // `phone` is deliberately absent: migration 0002's `zz_scripai_sync_phone_trigger`
    // mirrors `auth.users.phone` into `profiles` the moment the OTP verifies, so
    // writing it from here would be a second source of truth for the same value.
    await commit(user.id);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ name: signup.fullName.trim(), email: identity.email })
      .eq('id', user.id);

    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    // `profiles` just changed underneath the provider — without this the paywall and
    // home screen would render the pre-signup (empty) profile.
    await refreshProfile();
    router.replace('/(paywall)/commit');
    // Cleared after navigating, and without dropping `saving`: the account now owns
    // this data, and leaving it in the draft would let a later sign-out → sign-up in
    // the same app session start from a stale identity. Clearing it before the
    // replace commits would instead trip the cold-entry guard above.
    reset();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ProgressBar progress={1} />
      <StepHeader />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <StatusChip label="Number verified" />

        <Text style={styles.heading}>Finish your account</Text>
        <Text style={styles.subhead}>
          {identity
            ? `Check your details. Email came from ${PROVIDER_EMAIL_SOURCE[identity.provider]} and can't be edited.`
            : 'Check your details. Link Apple or Gmail for your email — receipts and recovery go there.'}
        </Text>

        <FieldCard
          label="Full name"
          value={signup.fullName}
          onChangeText={setFullName}
          placeholder="Your name"
          autoCapitalize="words"
          autoFocus={signup.fullName.length === 0}
        />

        {/* Changing the number means re-verifying it, so this routes back to the
            entry screen (prefilled) rather than opening an inline editor — the
            "Number verified" chip above must never describe an unconfirmed number.
            `verify-otp` unwinds back to this screen on success. */}
        <FieldCard
          label="Phone number"
          value={displayPhone}
          accessory="verified"
          onPress={handleChangePhone}
        />

        {/* Changeable once linked, so it carries the same chevron as the phone row —
            tapping re-opens the provider sheet to pick a different account. Before
            anything is linked there is nothing to change: the row stays inert and
            the Apple/Gmail buttons below are the way in. */}
        <FieldCard
          label="Email"
          value={identity?.email ?? ''}
          placeholder="Not linked yet"
          accessory={identity ? 'verified' : 'locked'}
          muted={!identity}
          onPress={identity ? () => setSheetProvider(identity.provider) : undefined}
        />

        {identity ? (
          <View style={styles.linkedBlock}>
            <View style={styles.linkedDividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                linked with {PROVIDER_LABEL[identity.provider]}
              </Text>
              <View style={styles.dividerLine} />
            </View>
            {/* Whole row is the tap target, with a chevron rather than a "Change"
                link — the arrow is what marks a value as changeable everywhere else
                on this screen, so the linked account uses the same signal. */}
            <DetailRows>
              <Pressable
                onPress={() => {
                  haptics.tap();
                  setSheetProvider(identity.provider);
                }}
                style={({ pressed }) => pressed && styles.rowPressed}
              >
                <DetailIconRow
                  icon={
                    identity.provider === 'apple' ? (
                      <AppleIcon size={18} />
                    ) : (
                      <GoogleIcon size={18} />
                    )
                  }
                  label={`${PROVIDER_EMAIL_SOURCE[identity.provider]} · ${signup.fullName || identity.name}`}
                  accessory={
                    <View style={styles.linkedAccessory}>
                      {/* No tick here, unlike the verified phone/email rows above.
                          The word alone carries it: the divider directly above
                          already reads "linked with Google", so a badge repeating
                          the same fact in a third place just crowds the row. */}
                      <Text style={styles.linkedBadge}>Linked</Text>
                      <ChevronRight size={14} color={colors.neutral[500]} />
                    </View>
                  }
                />
              </Pressable>
            </DetailRows>
            <Text style={styles.finePrint}>
              Email came from your {PROVIDER_EMAIL_SOURCE[identity.provider]}, so it always matches
              a verified account.{' '}
              <Text
                style={styles.finePrintLink}
                onPress={() => {
                  haptics.tap();
                  setSheetProvider(otherProvider);
                }}
              >
                Use {PROVIDER_LABEL[otherProvider]} instead
              </Text>
              .
            </Text>
          </View>
        ) : (
          <View style={styles.linkBlock}>
            <SocialAuthButtons
              onSelect={setSheetProvider}
              dividerLabel="link your email with"
              googleLabel="Gmail"
            />
            <Text style={styles.finePrint}>
              Email can only be set through Apple or Gmail, so it always matches a verified account.
            </Text>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <Button
        title={saving ? 'Finishing…' : identity ? 'Done' : 'Link email'}
        variant="primary"
        disabled={!canFinish}
        onPress={handleDone}
      />

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
    marginTop: spacing.sm,
  },
  subhead: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.neutral[700],
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    lineHeight: 21,
  },
  linkBlock: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  linkedBlock: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  linkedDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.neutral[600],
  },
  linkedAccessory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  linkedBadge: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    // Green, matching the tick beside it — see the `successDark` note in theme.ts.
    color: colors.successDark,
  },
  rowPressed: {
    opacity: 0.6,
  },
  finePrint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.neutral[600],
    lineHeight: 16,
  },
  finePrintLink: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.text,
    textDecorationLine: 'underline',
  },
  errorText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.accent[700],
  },
});

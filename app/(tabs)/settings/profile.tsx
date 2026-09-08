import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FieldGroup, FieldGroupRow } from '@/src/components/auth/FieldGroup';
import { ProviderSignInSheet } from '@/src/components/auth/ProviderSignInSheet';
import { SocialAuthButtons } from '@/src/components/auth/SocialAuthButtons';
import { Button } from '@/src/components/ui/Button';
import { DetailIconRow, DetailRows } from '@/src/components/ui/DetailRows';
import { AppleIcon, ChevronRight, GoogleIcon } from '@/src/components/ui/icons';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
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
import { colors, radii, shadows, spacing, typography } from '@/src/theme/theme';

export default function Profile() {
  const router = useRouter();
  const { profile, user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [sheetProvider, setSheetProvider] = useState<OAuthProvider | null>(null);

  // Which provider the current email came from. Supabase records each linked OAuth
  // provider as an identity row, but real OAuth isn't wired yet (see `oauth-mock`),
  // so a provider linked during this session is tracked here as well — otherwise
  // the row would snap back to "Connect" the moment the sheet closed. Seeded from
  // the session so a returning Apple user's email row re-opens Apple, not Google.
  const identityProviders = user?.identities?.map((i) => i.provider) ?? [];
  // An email on file can only have come from a provider — signup never lets one be
  // typed (see `handleAuthorized`). So when the session carries no identity row
  // (the mock never writes one; a phone-first signup has none either) the stored
  // address is still provider-supplied, and the screen says so rather than
  // implying the address was entered directly. Google is the default provider.
  const [linkedProvider, setLinkedProvider] = useState<OAuthProvider | null>(() =>
    identityProviders.includes('apple')
      ? 'apple'
      : identityProviders.includes('google') || profile?.email
        ? 'google'
        : null,
  );
  // Switching provider outright, per 1ck/1cm — it just reopens the sheet, and
  // `handleAuthorized` overwrites whatever was linked before, so there is no
  // separate unlink step to get wrong.
  const otherProvider: OAuthProvider = linkedProvider === 'google' ? 'apple' : 'google';

  /**
   * Linking (or re-linking) a provider is the only way to set the email — the same
   * rule signup enforces, so an address on file is always one the user proved they
   * control. The sheet's identity overwrites the field; the name is left alone,
   * since the user may have deliberately changed it here.
   */
  function handleAuthorized(identity: OAuthIdentity) {
    setEmail(identity.email);
    setLinkedProvider(identity.provider);
    setSheetProvider(null);
  }

  // 1mb shows the phone with a "Verified" badge. Supabase stamps `phone_confirmed_at`
  // only once an OTP has actually been confirmed, so the badge tracks that rather
  // than merely "a number exists on the profile".
  const phone = formatE164ForDisplay(profile?.phone);
  const phoneVerified = !!user?.phone_confirmed_at;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({ name: fullName, email }).eq('id', user.id);
    await refreshProfile();
    setSaving(false);
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* ScreenHeader owns the top inset (white bar carrying up behind the status
          bar, per 1mb) and the tab bar already covers the bottom inset — so this
          screen adds no safe-area padding of its own. A SafeAreaView here would
          add the bottom inset a second time and leave a white gap under the
          footer button. */}
      <ScreenHeader title="Profile" showBack />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{(fullName || '?').charAt(0).toUpperCase()}</Text>
          </View>
        </View>

        {/* Name is the one value typed here; phone and email are both changed
            elsewhere, so they render as read-only rows with a chevron. Same three
            fields, same order and same behaviour as 1ck/1cm — grouped into one
            card here rather than stacked as separate ones. */}
        <FieldGroup caption="Your details">
          <FieldGroupRow
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your name"
            autoCapitalize="words"
          />

          {/* Changing the number means re-verifying it, so this routes to 1mc
              rather than opening an inline editor. */}
          <FieldGroupRow
            label="Phone number"
            value={phone ?? ''}
            placeholder="Not set"
            muted={!phone}
            verified={!!phone && phoneVerified}
            onPress={() => router.push('/(tabs)/settings/change-phone')}
          />

          {/* Never typed: signup only ever sets the email through a provider, so
              tapping re-opens that provider's sheet to pick a different account. */}
          <FieldGroupRow
            label="Email"
            value={email}
            placeholder="Not linked yet"
            muted={!email}
            verified={!!email}
            onPress={email ? () => setSheetProvider(linkedProvider ?? 'google') : undefined}
          />
        </FieldGroup>

        {linkedProvider ? (
          <View style={styles.linkedBlock}>
            <View style={styles.linkedDividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>linked with {PROVIDER_LABEL[linkedProvider]}</Text>
              <View style={styles.dividerLine} />
            </View>
            <DetailRows>
              <Pressable
                onPress={() => {
                  haptics.tap();
                  setSheetProvider(linkedProvider);
                }}
                style={({ pressed }) => pressed && styles.rowPressed}
              >
                <DetailIconRow
                  icon={
                    linkedProvider === 'apple' ? <AppleIcon size={18} /> : <GoogleIcon size={18} />
                  }
                  label={`${PROVIDER_EMAIL_SOURCE[linkedProvider]} · ${fullName || 'Your account'}`}
                  accessory={
                    <View style={styles.linkedAccessory}>
                      <Text style={styles.linkedBadge}>Linked</Text>
                      <ChevronRight size={14} color={colors.neutral[500]} />
                    </View>
                  }
                />
              </Pressable>
            </DetailRows>
            <Text style={styles.finePrint}>
              Email came from your {PROVIDER_EMAIL_SOURCE[linkedProvider]}, so it always matches a
              verified account.{' '}
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
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={saving ? 'Saving…' : 'Save changes'}
          onPress={handleSave}
          disabled={saving}
        />
      </View>

      <ProviderSignInSheet
        provider={sheetProvider}
        onCancel={() => setSheetProvider(null)}
        onAuthorized={handleAuthorized}
      />
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
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    // The three fields now share one card and space themselves with internal
    // dividers, so this gap only separates the avatar, that card, and the
    // linked-provider block below it.
    gap: spacing.lg,
  },
  avatarWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: colors.accent.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  avatarInitial: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 26,
    color: colors.white,
  },
  linkBlock: {
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  linkedBlock: {
    gap: spacing.md,
    marginTop: spacing.sm,
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
  rowPressed: {
    opacity: 0.6,
  },
  linkedAccessory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  linkedBadge: {
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
  finePrintLink: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.text,
    textDecorationLine: 'underline',
  },
  footer: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
});

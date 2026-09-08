import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppleIcon, FlameIcon, GoogleIcon } from '@/src/components/ui/icons';
import * as haptics from '@/src/lib/haptics';
import {
  authorize,
  PROVIDER_LABEL,
  type OAuthIdentity,
  type OAuthProvider,
} from '@/src/lib/oauth-mock';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

interface ProviderSignInSheetProps {
  /** Which provider's sheet to show; `null` keeps the sheet closed. */
  provider: OAuthProvider | null;
  onCancel: () => void;
  onAuthorized: (identity: OAuthIdentity) => void;
}

/**
 * The simulated OS sign-in sheet from 1cg / 1cg2 — a dark scrim over the screen
 * beneath, and a white sheet with the name/email the provider will share.
 *
 * The mockups draw an actual iOS system sheet. We can't render one (it belongs to
 * the OS, and there's no real OAuth wired up yet — see `oauth-mock`), so this
 * reproduces its shape in-app: drag handle, provider title, the two shared data
 * rows, and a black confirm pill. On Apple the email row reads "Hide My Email",
 * matching 1cg, because that is what Apple's own sheet offers.
 */
export function ProviderSignInSheet({
  provider,
  onCancel,
  onAuthorized,
}: ProviderSignInSheetProps) {
  const [authorizing, setAuthorizing] = useState(false);

  async function handleConfirm() {
    if (!provider || authorizing) return;
    haptics.heavy();
    setAuthorizing(true);
    const identity = await authorize(provider);
    setAuthorizing(false);
    onAuthorized(identity);
  }

  function handleCancel() {
    if (authorizing) return;
    onCancel();
  }

  const isApple = provider === 'apple';
  const confirmLabel = authorizing ? 'Signing in…' : isApple ? 'Continue with Face ID' : 'Continue';

  return (
    <Modal
      visible={provider !== null}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <Pressable style={styles.scrim} onPress={handleCancel} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.titleRow}>
          {isApple ? (
            <FlameIcon size={22} color={colors.accent.DEFAULT} />
          ) : (
            <GoogleIcon size={22} />
          )}
          <View style={styles.titleText}>
            <Text style={styles.title}>
              Sign in to ScripAI with {provider ? PROVIDER_LABEL[provider] : ''}
            </Text>
            <Text style={styles.subtitle}>ScripAI will receive your name and email.</Text>
          </View>
        </View>

        <View style={styles.dataCard}>
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Name</Text>
            <Text style={styles.dataValue}>Sagar Jaid</Text>
          </View>
          <View style={styles.dataDivider} />
          <View style={styles.dataRow}>
            <Text style={styles.dataLabel}>Email</Text>
            <Text style={styles.dataValue}>
              {isApple ? 'Hide My Email' : 'sagar@rategmail.com'}
            </Text>
          </View>
        </View>

        <Text style={styles.note}>
          We'll still ask for your phone number so reminders and AI calls can reach you.
        </Text>

        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [styles.confirmButton, pressed && styles.confirmPressed]}
        >
          <Text style={styles.confirmLabel}>{confirmLabel}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(32,30,29,0.55)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 40,
    gap: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral[300],
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  titleText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.size.h4,
    color: colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.neutral[700],
  },
  dataCard: {
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 50,
  },
  dataDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.neutral[300],
  },
  dataLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.neutral[700],
  },
  dataValue: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.body,
    color: colors.text,
  },
  note: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.neutral[600],
    lineHeight: 18,
  },
  confirmButton: {
    height: 54,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
  confirmPressed: {
    opacity: 0.85,
  },
  confirmLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.button,
    color: colors.white,
  },
});

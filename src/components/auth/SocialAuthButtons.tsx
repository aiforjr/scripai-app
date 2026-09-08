import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import * as haptics from '@/src/lib/haptics';
import type { OAuthProvider } from '@/src/lib/oauth-mock';
import { colors, radii, shadows, spacing, typography } from '@/src/theme/theme';

function AppleGlyph({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size * (512 / 384)} viewBox="0 0 384 512" fill={colors.text}>
      <Path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </Svg>
  );
}

function GoogleGlyph({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <Path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <Path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.68 9c0-.593.102-1.17.284-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <Path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.581C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </Svg>
  );
}

function showComingSoon() {
  Alert.alert('Coming soon', "Apple/Google sign-in isn't set up yet — use phone or email instead.");
}

interface SocialAuthButtonsProps {
  /**
   * Called with the tapped provider. When omitted the buttons keep their original
   * "coming soon" behaviour — that's still what the login screen wants, since only
   * the signup flow has the sheet → phone → finish path to hand the identity to.
   */
  onSelect?: (provider: OAuthProvider) => void;
  /** Divider copy: "or continue with" on 1ca, "link your email with" on 1cf. */
  dividerLabel?: string;
  /** 1cf labels the Google button "Gmail" — it's linking a mailbox, not signing in. */
  googleLabel?: string;
  /** Greys both buttons while a sheet is already resolving. */
  disabled?: boolean;
}

/**
 * "or continue with" divider + Apple/Google pill buttons.
 *
 * Real OAuth still isn't wired (no developer credentials). Screens that can carry
 * the signup flow forward pass `onSelect` and drive `ProviderSignInSheet` with the
 * mocked identity from `oauth-mock`; screens that can't fall back to the original
 * "coming soon" alert.
 */
export function SocialAuthButtons({
  onSelect,
  dividerLabel = 'or continue with',
  googleLabel = 'Google',
  disabled,
}: SocialAuthButtonsProps = {}) {
  function handlePress(provider: OAuthProvider) {
    if (disabled) return;
    haptics.tap();
    if (onSelect) onSelect(provider);
    else showComingSoon();
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{dividerLabel}</Text>
        <View style={styles.dividerLine} />
      </View>
      <View style={styles.socialRow}>
        <Pressable
          style={({ pressed }) => [
            styles.socialButton,
            (pressed || disabled) && styles.socialButtonDim,
          ]}
          onPress={() => handlePress('apple')}
        >
          <AppleGlyph />
          <Text style={styles.socialLabel}>Apple</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.socialButton,
            (pressed || disabled) && styles.socialButtonDim,
          ]}
          onPress={() => handlePress('google')}
        >
          <GoogleGlyph />
          <Text style={styles.socialLabel}>{googleLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
  },
  dividerRow: {
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
  socialRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 54,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  socialButtonDim: {
    opacity: 0.55,
  },
  socialLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.body,
    color: colors.text,
  },
});

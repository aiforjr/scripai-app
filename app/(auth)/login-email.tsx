import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { StepHeader } from '@/src/components/ui/StepHeader';
import { TextField } from '@/src/components/ui/TextField';
import { supabase } from '@/src/lib/supabase';
import { isValidEmail } from '@/src/lib/validation';
import { useOnboardingDraft } from '@/src/providers/OnboardingDraftProvider';
import { colors, spacing, typography } from '@/src/theme/theme';

type Mode = 'signin' | 'signup';

// Not part of the original design (email auth is an addition for this build) — a
// straightforward email + password screen with a sign in / create account toggle.
export default function LoginEmail() {
  const router = useRouter();
  const { commit } = useOnboardingDraft();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignin = mode === 'signin';
  const canSubmit = isValidEmail(email) && password.length >= 6 && !loading;

  function toggleMode() {
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
    setError(null);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);

    if (isSignin) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.replace('/');
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (!data.user) {
      setError('Check your email to confirm your account, then sign in.');
      return;
    }
    // Brand-new account bypassing the onboarding-quiz-first flow — flush the (likely
    // mostly-empty) draft so a `profiles` row exists in the same shape as the phone flow.
    await commit(data.user.id);
    router.replace('/(paywall)/commit');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StepHeader />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>
          {isSignin ? 'Sign in with email' : 'Create your account'}
        </Text>
        <Text style={styles.subhead}>
          {isSignin
            ? 'Enter your email and password.'
            : 'Set an email and password to get started.'}
        </Text>

        <TextField
          label="Email"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (error) setError(null);
          }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (error) setError(null);
          }}
          placeholder="At least 6 characters"
          secureTextEntry
          autoCapitalize="none"
          error={error ?? undefined}
        />

        <Button
          title={loading ? 'Please wait…' : isSignin ? 'Sign in' : 'Create account'}
          variant="primary"
          disabled={!canSubmit}
          onPress={handleSubmit}
          style={styles.submitButton}
        />

        <Pressable onPress={toggleMode} hitSlop={8} style={styles.toggleLink}>
          <Text style={styles.toggleLinkText}>
            {isSignin ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
          </Text>
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
  submitButton: {
    marginTop: spacing.sm,
  },
  toggleLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  toggleLinkText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.body,
    color: colors.accent.DEFAULT,
  },
});

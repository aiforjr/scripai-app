import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { OnboardingBadge } from '@/src/components/ui/OnboardingBadge';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { StepHeader } from '@/src/components/ui/StepHeader';
import { TextField } from '@/src/components/ui/TextField';
import { useOnboardingDraft } from '@/src/providers/OnboardingDraftProvider';
import { colors, spacing, typography } from '@/src/theme/theme';

export default function Name() {
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();

  const canProceed = draft.fullName.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ProgressBar progress={0.2} />
      <StepHeader title="What's your name?" />

      <View style={styles.content}>
        <OnboardingBadge />
        <Text style={styles.heading}>What's your full name?</Text>
        <Text style={styles.subhead}>So the scripts can talk to you like a friend.</Text>

        <TextField
          value={draft.fullName}
          onChangeText={(fullName) => update({ fullName })}
          placeholder="Your full name"
          autoCapitalize="words"
          autoFocus
        />
      </View>

      <Button
        title="Next"
        variant="primary"
        disabled={!canProceed}
        onPress={() => router.push('/(onboarding)/age')}
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
    paddingTop: spacing.xl,
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
    marginTop: spacing.xs,
    marginBottom: spacing.xxl,
  },
});

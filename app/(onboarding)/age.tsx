import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { OnboardingBadge } from '@/src/components/ui/OnboardingBadge';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { RadioOption } from '@/src/components/ui/RadioOption';
import { StepHeader } from '@/src/components/ui/StepHeader';
import { useOnboardingDraft } from '@/src/providers/OnboardingDraftProvider';
import { colors, spacing, typography } from '@/src/theme/theme';
import type { AgeBracket } from '@/src/types/database.types';

const AGE_OPTIONS: { label: string; value: AgeBracket }[] = [
  { label: '18–24', value: '18-24' },
  { label: '25–34', value: '25-34' },
  { label: '35–44', value: '35-44' },
  { label: '45–54', value: '45-54' },
  { label: '55+', value: '55+' },
];

export default function Age() {
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();

  const canProceed = draft.ageBracket !== null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ProgressBar progress={0.3} />
      <StepHeader title="Age" />

      <View style={styles.content}>
        <OnboardingBadge />
        <Text style={styles.heading}>How old are you?</Text>
        <Text style={styles.subhead}>Helps us pick topics and examples that fit.</Text>

        <View style={styles.options}>
          {AGE_OPTIONS.map((option) => (
            <RadioOption
              key={option.value}
              label={option.label}
              selected={draft.ageBracket === option.value}
              onPress={() => update({ ageBracket: option.value })}
            />
          ))}
        </View>
      </View>

      <Button
        title="Next"
        variant="primary"
        disabled={!canProceed}
        onPress={() => router.push('/(onboarding)/gender')}
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
  options: {
    gap: spacing.sm,
  },
});

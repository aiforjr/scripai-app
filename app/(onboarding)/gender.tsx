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
import type { Gender } from '@/src/types/database.types';

const GENDER_OPTIONS: { label: string; value: NonNullable<Gender> }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

export default function GenderScreen() {
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();

  const goNext = () => router.push('/(onboarding)/fear-triggers');

  // The question is optional, but the answer is still an explicit one — "Prefer
  // not to say" is how you decline it. Gating on a chosen value keeps Next from
  // reading as a no-op tap.
  const canProceed = draft.gender !== null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ProgressBar progress={0.4} />
      <StepHeader />

      <View style={styles.content}>
        <OnboardingBadge />
        <Text style={styles.heading}>How do you identify?</Text>
        <Text style={styles.subhead}>Optional. Used only to personalise script voice.</Text>

        <View style={styles.options}>
          {GENDER_OPTIONS.map((option) => (
            <RadioOption
              key={option.value}
              label={option.label}
              selected={draft.gender === option.value}
              onPress={() => update({ gender: option.value })}
            />
          ))}
        </View>
      </View>

      <Button title="Next" variant="primary" disabled={!canProceed} onPress={goNext} />
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

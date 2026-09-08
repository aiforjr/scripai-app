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

const SITUATIONS = [
  'Work video calls',
  'Social media videos',
  'Job interviews',
  'Presentations & talks',
  'Dating & personal videos',
  'Teaching or courses',
];

export default function FearTriggers() {
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();

  const canProceed = draft.cameraFearSituation !== null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ProgressBar progress={0.5} />
      <StepHeader title="Camera fear" />

      <View style={styles.content}>
        <OnboardingBadge />
        <Text style={styles.heading}>Why are you here?</Text>
        <Text style={styles.subhead}>Pick what you're practising for.</Text>

        <View style={styles.options}>
          {SITUATIONS.map((situation) => (
            <RadioOption
              key={situation}
              label={situation}
              selected={draft.cameraFearSituation === situation}
              onPress={() => update({ cameraFearSituation: situation })}
            />
          ))}
        </View>
      </View>

      <Button
        title="Next"
        variant="primary"
        disabled={!canProceed}
        onPress={() => router.push('/(onboarding)/topics')}
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

import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { OnboardingBadge } from '@/src/components/ui/OnboardingBadge';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { StepHeader } from '@/src/components/ui/StepHeader';
import { colors, spacing, typography } from '@/src/theme/theme';

export default function TrialOffer() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ProgressBar progress={0.6} />
      <StepHeader title="Free trial" showBack={false} />
      <OnboardingBadge center />

      <View style={styles.content}>
        <Text style={styles.heading}>3 days of premium, on us</Text>
        <Text style={styles.subhead}>
          Everything unlocked while you record your first three takes.
        </Text>
      </View>

      <Button title="Next" variant="primary" onPress={() => router.push('/(paywall)/features')} />
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  heading: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.size.h2,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subhead: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.neutral[700],
    textAlign: 'center',
    lineHeight: 21,
  },
});

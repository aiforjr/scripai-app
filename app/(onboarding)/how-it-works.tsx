import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { OnboardingBadge } from '@/src/components/ui/OnboardingBadge';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { StepHeader } from '@/src/components/ui/StepHeader';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

const STEPS = [
  { title: 'Get a topic', body: 'A fresh one-minute script, written for you.' },
  {
    title: 'Record it',
    body: 'Read from the on-screen teleprompter. One take, max a minute.',
  },
  {
    title: 'Watch it back, three ways',
    body: 'Audio only. Video only. Then both together.',
  },
];

export default function HowItWorks() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ProgressBar progress={0.1} />
      <StepHeader title="How it works" />

      <View style={styles.content}>
        <OnboardingBadge />
        <Text style={styles.heading}>How it works</Text>
        <Text style={styles.subhead}>The same small loop, every day this month.</Text>

        <View style={styles.timeline}>
          {STEPS.map((step, i) => (
            <View key={step.title} style={styles.stepRow}>
              <View style={styles.stepIndicator}>
                <View style={styles.stepCircle}>
                  <Text style={styles.stepNumber}>{i + 1}</Text>
                </View>
                {i < STEPS.length - 1 && <View style={styles.stepLine} />}
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <Button
        title="Start my month"
        variant="primary"
        onPress={() => router.push('/(onboarding)/name')}
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
  },
  timeline: {
    gap: 0,
    marginTop: spacing.xxl,
  },
  stepRow: {
    flexDirection: 'row',
  },
  stepIndicator: {
    alignItems: 'center',
    width: 40,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.accent.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 14,
    color: colors.white,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 48,
    backgroundColor: colors.neutral[300],
    marginVertical: spacing.sm,
  },
  stepText: {
    flex: 1,
    paddingBottom: spacing.xxl,
    paddingLeft: spacing.md,
  },
  stepTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 2,
  },
  stepBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.neutral[700],
    lineHeight: 20,
  },
});

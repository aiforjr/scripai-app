import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { OnboardingBadge } from '@/src/components/ui/OnboardingBadge';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { StepHeader } from '@/src/components/ui/StepHeader';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

const BENEFITS = [
  {
    title: 'Desensitise the lens',
    body: 'Daily exposure shrinks the fear response. The camera stops being an audience.',
  },
  {
    title: 'Hear your real voice',
    body: 'Reviewing audio, video and both separately trains you to notice, not cringe.',
  },
  {
    title: 'Proof you’re improving',
    body: 'Thirty recordings on a calendar. Watch day 1 next to day 30.',
  },
];

export default function Benefits() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ProgressBar progress={0.7} />
      <StepHeader />

      <View style={styles.content}>
        <OnboardingBadge />
        <Text style={styles.heading}>What one minute a day does</Text>

        <View style={styles.cards}>
          {BENEFITS.map((benefit, i) => (
            <Card key={benefit.title}>
              <View style={styles.cardRow}>
                <View style={styles.bullet}>
                  <Text style={styles.bulletText}>{i + 1}</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{benefit.title}</Text>
                  <Text style={styles.cardBody}>{benefit.body}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </View>

      <Button
        title="Next"
        variant="primary"
        onPress={() => router.push('/(onboarding)/reminders')}
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
    marginBottom: spacing.xxl,
  },
  cards: {
    gap: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  bullet: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.accent[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: 17,
    color: colors.accent.DEFAULT,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  cardBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.neutral[700],
    lineHeight: 20,
  },
});

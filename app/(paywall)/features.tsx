import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { OnboardingBadge } from '@/src/components/ui/OnboardingBadge';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { StepHeader } from '@/src/components/ui/StepHeader';
import { CheckIcon } from '@/src/components/ui/icons';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

const FEATURES = [
  'Your first 3 days are free',
  'Cancel any time from the app or App Store',
  'AI scripts written for your topics',
  'Audio, video and combined review',
  'Leaderboard, streaks and badges',
  'Home-screen widget and AI call reminders',
];

const MAX_TOP_INSET = 59;

export default function Features() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.min(insets.top, MAX_TOP_INSET);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: topInset + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      <ProgressBar progress={1} />
      <StepHeader title="Premium" showBack />
      <OnboardingBadge center />

      <View style={styles.content}>
        <Text style={styles.heading}>What you&apos;ll get</Text>

        <View style={styles.list}>
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.row}>
              <View style={styles.checkBadge}>
                <CheckIcon size={16} color={colors.accent.DEFAULT} />
              </View>
              <Text style={styles.rowText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>

      <Button
        title="Try for free"
        variant="primary"
        onPress={() => router.push('/(paywall)/trial-sheet')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
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
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  list: {
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.accent[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.text,
  },
});

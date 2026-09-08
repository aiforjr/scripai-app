import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { Chip } from '@/src/components/ui/Chip';
import { OnboardingBadge } from '@/src/components/ui/OnboardingBadge';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { StepHeader } from '@/src/components/ui/StepHeader';
import { TOPIC_LABELS } from '@/src/lib/topics';
import { useOnboardingDraft } from '@/src/providers/OnboardingDraftProvider';
import { colors, spacing, typography } from '@/src/theme/theme';

// Shared vocabulary: these labels are stored verbatim in `profiles.topic_preferences`
// and must match what the settings and edit-script screens offer, so a topic picked
// here still reads as selected there. See src/lib/topics.ts.
const TOPICS = TOPIC_LABELS;

export default function Topics() {
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();

  const goNext = () => router.push('/(onboarding)/benefits');

  // Multi-select: one topic is enough. Skip stays open — it's the deliberate way
  // past this step, and leaves `topicPreferences` empty for the script generator
  // to fall back on the full pool.
  const canProceed = draft.topicPreferences.length > 0;

  const toggleTopic = (topic: string) => {
    const isSelected = draft.topicPreferences.includes(topic);
    update({
      topicPreferences: isSelected
        ? draft.topicPreferences.filter((t) => t !== topic)
        : [...draft.topicPreferences, topic],
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ProgressBar progress={0.6} />
      <StepHeader onSkip={goNext} />

      <View style={styles.content}>
        <OnboardingBadge />
        <Text style={styles.heading}>What do you want to talk about?</Text>
        <Text style={styles.subhead}>We'll write tomorrow's script from this mix.</Text>

        <View style={styles.chipGrid}>
          {TOPICS.map((topic) => (
            <Chip
              key={topic}
              label={topic}
              selected={draft.topicPreferences.includes(topic)}
              onPress={() => toggleTopic(topic)}
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
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});

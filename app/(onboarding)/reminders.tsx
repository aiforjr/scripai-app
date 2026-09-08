import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { BellIcon, FlameIcon, PhoneCallIcon } from '@/src/components/ui/icons';
import { OnboardingBadge } from '@/src/components/ui/OnboardingBadge';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { StepHeader } from '@/src/components/ui/StepHeader';
import { ToggleRow } from '@/src/components/ui/ToggleRow';
import * as haptics from '@/src/lib/haptics';
import { useOnboardingDraft } from '@/src/providers/OnboardingDraftProvider';
import { colors, radii, shadows, spacing, typography } from '@/src/theme/theme';

const TIME_PRESETS = ['07:00', '08:00', '12:30', '18:00', '20:00', '21:30'];

/** Formats an 'HH:mm' string as a 12-hour clock label, e.g. '20:00' -> '8:00 PM'. */
function formatTime12h(hhmm: string): string {
  const [hourStr, minute] = hhmm.split(':');
  const hour = Number(hourStr);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
}

export default function Reminders() {
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();

  const cycleTime = () => {
    haptics.select();
    const currentIndex = TIME_PRESETS.indexOf(draft.reminderTime);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % TIME_PRESETS.length;
    update({ reminderTime: TIME_PRESETS[nextIndex] });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ProgressBar progress={0.8} />
      <StepHeader />

      <View style={styles.content}>
        <OnboardingBadge />
        <Text style={styles.heading}>When should we nudge you?</Text>
        <Text style={styles.subhead}>One reminder a day. Pick a time you can actually record.</Text>

        <Card style={styles.previewCard}>
          <View style={styles.previewRow}>
            <View style={styles.previewIcon}>
              <FlameIcon size={16} color={colors.white} />
            </View>
            <Text style={styles.previewApp}>ScripAI</Text>
            <Text style={styles.previewNow}>now</Text>
          </View>
          <Text style={styles.previewBody}>
            Your script is ready. One minute, whenever you're set.
          </Text>
        </Card>

        {/* Time and both channel rows share one white card with hairlines between
            them, matching the settings screen's `channelCard`. */}
        <View style={styles.settingsCard}>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>Remind at</Text>
            <Pressable
              onPress={cycleTime}
              accessibilityRole="button"
              accessibilityLabel={`Remind at ${formatTime12h(draft.reminderTime)}, tap to change`}
              style={styles.timePill}
            >
              <Text style={styles.timePillText}>{formatTime12h(draft.reminderTime)}</Text>
            </Pressable>
          </View>
          <View style={styles.divider} />
          <ToggleRow
            icon={<BellIcon size={16} color={colors.accent[700]} strokeWidth={2.25} />}
            label="Notification"
            value={draft.notificationsEnabled}
            onValueChange={(notificationsEnabled) => update({ notificationsEnabled })}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon={<PhoneCallIcon size={16} color={colors.accent[700]} strokeWidth={2.25} />}
            label="AI call"
            subtitle="A short call walks you to the camera"
            value={draft.aiCallEnabled}
            onValueChange={(aiCallEnabled) => update({ aiCallEnabled })}
          />
        </View>
      </View>

      <Button
        title="Allow notifications"
        variant="primary"
        onPress={() => router.push('/(onboarding)/streak-intro')}
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
  previewCard: {
    marginBottom: spacing.xl,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewIcon: {
    width: 22,
    height: 22,
    borderRadius: radii.sm - 6,
    backgroundColor: colors.accent.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewApp: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 14,
    color: colors.text,
  },
  previewNow: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 12,
    color: colors.neutral[500],
  },
  previewBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    color: colors.neutral[700],
  },
  settingsCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    ...shadows.card,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.neutral[200],
  },
  // Matches the toggle rows' `paddingVertical: spacing.md` so all three rows in
  // the card have the same rhythm.
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  settingsLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.text,
  },
  // Rounded rect rather than `radii.pill` — the mockup's time chip is a soft
  // square, which keeps it reading as a value you can tap rather than a tag.
  timePill: {
    paddingHorizontal: spacing.lg,
    height: 36,
    borderRadius: radii.sm - 4,
    backgroundColor: colors.accent[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePillText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.accent.DEFAULT,
  },
});

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BellIcon, PhoneCallIcon, RadioCircle } from '@/src/components/ui/icons';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { ToggleRow } from '@/src/components/ui/ToggleRow';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radii, shadows, spacing, typography } from '@/src/theme/theme';

const TIME_SLOTS = ['07:00', '08:00', '12:30', '18:00', '20:00', '21:30'];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DEFAULT_DAYS = [1, 2, 3, 4, 5]; // Mon-Fri

function formatTime12h(hhmm: string): string {
  const [hourStr, minute] = hhmm.split(':');
  const hour = Number(hourStr);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
}

export default function Reminders() {
  const { profile, user, refreshProfile } = useAuth();

  const notificationsEnabled = profile?.notifications_enabled ?? false;
  const aiCallEnabled = profile?.ai_call_enabled ?? false;
  const reminderTime = profile?.reminder_time ?? '20:00';
  const reminderDays = profile?.reminder_days ?? DEFAULT_DAYS;

  const updateProfile = async (patch: Record<string, unknown>) => {
    if (!user) return;
    await supabase.from('profiles').update(patch).eq('id', user.id);
    await refreshProfile();
  };

  const toggleDay = (day: number) => {
    const has = reminderDays.includes(day);
    const next = has ? reminderDays.filter((d) => d !== day) : [...reminderDays, day].sort();
    updateProfile({ reminder_days: next });
  };

  return (
    <View style={styles.container}>
      {/* ScreenHeader owns the top inset (white bar carrying up behind the status
          bar, per 1md) and the tab bar already covers the bottom inset — so this
          screen adds no safe-area padding of its own. A SafeAreaView here would
          add the bottom inset a second time and leave a white gap at the bottom. */}
      <ScreenHeader title="Daily reminder" showBack />

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Remind me with</Text>
        <View style={styles.channelCard}>
          <ToggleRow
            icon={<BellIcon size={16} color={colors.accent[700]} strokeWidth={2.25} />}
            label="Notification"
            subtitle="A push at your chosen time"
            value={notificationsEnabled}
            onValueChange={(v) => updateProfile({ notifications_enabled: v })}
          />
          <View style={styles.channelDivider} />
          <ToggleRow
            icon={<PhoneCallIcon size={16} color={colors.accent[700]} strokeWidth={2.25} />}
            label="AI call"
            subtitle="A short call walks you to the camera"
            value={aiCallEnabled}
            onValueChange={(v) => updateProfile({ ai_call_enabled: v })}
          />
        </View>

        <Text style={styles.sectionTitle}>Time</Text>
        <View
          style={[styles.timeList, !notificationsEnabled && styles.disabledSection]}
          pointerEvents={notificationsEnabled ? 'auto' : 'none'}
        >
          {TIME_SLOTS.map((slot, i) => {
            const selected = slot === reminderTime;
            return (
              <Pressable
                key={slot}
                onPress={() => notificationsEnabled && updateProfile({ reminder_time: slot })}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: !notificationsEnabled }}
                style={[styles.timeRow, i === TIME_SLOTS.length - 1 && styles.timeRowLast]}
              >
                <Text style={styles.timeLabel}>{formatTime12h(slot)}</Text>
                {/* Every row carries a circle — empty until chosen — so the list reads
                    as a radio group rather than a plain list with one stray tick. */}
                <RadioCircle selected={selected} />
              </Pressable>
            );
          })}
        </View>

        {notificationsEnabled && (
          <>
            <Text style={styles.sectionTitle}>Repeat</Text>
            <View style={styles.daysRow}>
              {DAY_LABELS.map((label, i) => {
                const selected = reminderDays.includes(i);
                return (
                  <Pressable
                    key={i}
                    onPress={() => toggleDay(i)}
                    style={[styles.dayCircle, selected && styles.dayCircleActive]}
                  >
                    <Text style={[styles.dayLabel, selected && styles.dayLabelActive]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {notificationsEnabled ? (
          <Text style={styles.footer}>Next reminder: today at {formatTime12h(reminderTime)}</Text>
        ) : (
          <View style={styles.persuasionCallout}>
            <Text style={styles.persuasionText}>
              Without a reminder most people miss two or three days a month. Turn it back on any
              time.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // White so the header bar's colour carries up behind the status bar; the
    // body below paints itself page-gray.
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  // Uppercase letterspaced group heading per 1md, matching the profile screen's.
  sectionTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.neutral[600],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  // The two channel rows share one white card with a hairline between them, per 1md.
  channelCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    ...shadows.card,
  },
  channelDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.neutral[200],
  },
  timeList: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    ...shadows.card,
  },
  disabledSection: {
    opacity: 0.4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
  },
  timeRowLast: {
    borderBottomWidth: 0,
  },
  timeLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.text,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: colors.accent.DEFAULT,
    borderColor: colors.accent.DEFAULT,
  },
  dayLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.neutral[600],
  },
  dayLabelActive: {
    color: colors.white,
  },
  footer: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.neutral[600],
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  // The off-state copy is persuasion, not status: per 1me it sits in the same
  // accent-tinted callout block as 1mc's OTP notice, so it reads as a nudge rather
  // than as the neutral, centered "Next reminder" line.
  persuasionCallout: {
    backgroundColor: colors.accent[100],
    borderRadius: radii.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  persuasionText: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.accent[800],
  },
});

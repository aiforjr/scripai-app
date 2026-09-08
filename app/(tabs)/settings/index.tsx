import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  DEFAULT_TELEPROMPTER_SPEED,
  DEFAULT_TELEPROMPTER_TEXT_SIZE,
  DEFAULT_TELEPROMPTER_ZOOM,
  SPEED_SHORT_LABEL,
  TELEPROMPTER_SPEEDS,
  TEXT_SIZE_LABEL,
} from '@/src/components/recording/Teleprompter';
import { ProfileStatsCard } from '@/src/components/profile/ProfileStatsCard';
import { BadgesRow } from '@/src/components/settings/BadgesRow';
import { LogoutDialog } from '@/src/components/settings/LogoutDialog';
import { Card } from '@/src/components/ui/Card';
import { BellIcon, ChevronRight, PhoneCallIcon } from '@/src/components/ui/icons';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { ToggleRow } from '@/src/components/ui/ToggleRow';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radii, spacing, typography } from '@/src/theme/theme';
import type { LeaderboardRow } from '@/src/types/database.types';

function formatTime12h(hhmm: string | null): string {
  if (!hhmm) return 'Not set';
  const [hourStr, minute] = hhmm.split(':');
  const hour = Number(hourStr);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute} ${period}`;
}

export default function SettingsIndex() {
  const router = useRouter();
  const { profile, user, refreshProfile, signOut } = useAuth();
  const [rankInfo, setRankInfo] = useState<{ rank: number; total: number } | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase
      .from('leaderboard')
      .select('*')
      .order('rank', { ascending: true })
      .limit(50)
      .then(({ data, error }) => {
        if (!mounted || error || !data) return;
        const rows = data as LeaderboardRow[];
        const me = rows.find((r) => r.user_id === user?.id);
        if (me) setRankInfo({ rank: me.rank, total: rows.length });
      });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Lifetime days stand-in: see NOTE in leaderboard/index.tsx — `points` accrues once
  // per completed day, which is the closest field to "lifetime days logged".
  const lifetimeDays = profile?.points ?? 0;
  const currentStreak = profile?.current_streak ?? 0;
  const bestStreak = profile?.longest_streak ?? 0;

  const updateProfile = async (patch: Record<string, unknown>) => {
    if (!user) return;
    await supabase.from('profiles').update(patch).eq('id', user.id);
    await refreshProfile();
  };

  const handleLogout = async () => {
    setLogoutVisible(false);
    await signOut();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Settings" />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ProfileStatsCard
          name={profile?.name ?? 'You'}
          contact={profile?.email || profile?.phone || 'No contact info'}
          // "up 2 this week" is static placeholder copy — no ranking-history feature yet.
          rankLine={`${rankInfo ? `#${rankInfo.rank} of ${rankInfo.total}` : 'Unranked'} · up 2 this week`}
          lifetimeDays={lifetimeDays}
          currentStreak={currentStreak}
          bestStreak={bestStreak}
          accessory={
            <Pressable
              onPress={() => router.push('/(tabs)/settings/profile')}
              style={styles.editPill}
              hitSlop={8}
            >
              <Text style={styles.editPillText}>Edit</Text>
            </Pressable>
          }
        />

        <Text style={styles.sectionTitle}>Badges</Text>
        <BadgesRow longestStreak={bestStreak} />

        <Text style={styles.sectionTitle}>Daily reminder</Text>
        {/* Per 1ma these two toggles are live inline — the same state as 1md, editable
            here without opening the sub-screen. Only the Time row navigates. */}
        <Card style={styles.reminderCard}>
          <ToggleRow
            icon={<BellIcon size={16} color={colors.accent[700]} strokeWidth={2.25} />}
            label="Notification"
            subtitle="A push at your chosen time"
            value={profile?.notifications_enabled ?? false}
            onValueChange={(v) => updateProfile({ notifications_enabled: v })}
          />
          <ToggleRow
            icon={<PhoneCallIcon size={16} color={colors.accent[700]} strokeWidth={2.25} />}
            label="AI call"
            subtitle="A short call walks you to the camera"
            value={profile?.ai_call_enabled ?? false}
            onValueChange={(v) => updateProfile({ ai_call_enabled: v })}
          />
          <Pressable
            onPress={() => router.push('/(tabs)/settings/reminders')}
            style={styles.rowBetween}
          >
            <Text style={styles.rowLabel}>Time</Text>
            <View style={styles.reminderTimeRow}>
              <Text style={styles.rowValue}>{formatTime12h(profile?.reminder_time ?? null)}</Text>
              <ChevronRight size={14} color={colors.neutral[500]} />
            </View>
          </Pressable>
        </Card>

        <Text style={styles.sectionTitle}>Teleprompter defaults</Text>
        <Card style={styles.section}>
          {/* 1mh shows this as a labelled row with the pills inline on the right,
              editable here without opening the sub-screen. */}
          <View style={styles.rowBetween}>
            <Text style={styles.rowLabel}>Scroll speed</Text>
            <View style={styles.segmentedControl}>
              {TELEPROMPTER_SPEEDS.map((option) => {
                const active =
                  (profile?.teleprompter_speed ?? DEFAULT_TELEPROMPTER_SPEED) === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => updateProfile({ teleprompter_speed: option })}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={[styles.segmentPill, active && styles.segmentPillActive]}
                  >
                    <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                      {SPEED_SHORT_LABEL[option]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Text size and zoom both live on the Teleprompter screen (1mf), which
              has the live preview that makes either choice meaningful. */}
          <Pressable
            onPress={() => router.push('/(tabs)/settings/teleprompter')}
            style={styles.rowBetween}
          >
            <Text style={styles.rowLabel}>Text size</Text>
            <View style={styles.reminderTimeRow}>
              <Text style={styles.rowValue}>
                {TEXT_SIZE_LABEL[profile?.teleprompter_text_size ?? DEFAULT_TELEPROMPTER_TEXT_SIZE]}
              </Text>
              <ChevronRight size={14} color={colors.neutral[500]} />
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/settings/teleprompter')}
            style={styles.rowBetween}
          >
            <Text style={styles.rowLabel}>Default zoom</Text>
            <View style={styles.reminderTimeRow}>
              <Text style={styles.rowValue}>
                {Math.round((profile?.teleprompter_zoom ?? DEFAULT_TELEPROMPTER_ZOOM) * 100)}%
              </Text>
              <ChevronRight size={14} color={colors.neutral[500]} />
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/settings/topic-style')}
            style={styles.rowBetween}
          >
            <Text style={styles.rowLabel}>Topic style</Text>
            <View style={styles.reminderTimeRow}>
              <Text style={styles.rowValue} numberOfLines={1}>
                {(profile?.topic_preferences ?? []).join(', ') || 'Not set'}
              </Text>
              <ChevronRight size={14} color={colors.neutral[500]} />
            </View>
          </Pressable>
        </Card>

        <Text style={styles.sectionTitle}>Account</Text>
        <Card style={styles.section}>
          <Pressable onPress={() => setLogoutVisible(true)} style={styles.rowBetween}>
            <Text style={styles.logoutLabel}>Log out</Text>
          </Pressable>
        </Card>
      </ScrollView>

      <LogoutDialog
        visible={logoutVisible}
        onConfirm={handleLogout}
        onCancel={() => setLogoutVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // White so the header bar's colour carries up behind the status bar; the
    // body below paints itself page-gray.
    backgroundColor: colors.white,
  },
  body: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  editPill: {
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPillText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.neutral[800],
  },
  // Small uppercase section label, matching the standing screen's.
  sectionTitle: {
    fontFamily: typography.fontFamily.semibold,
    // Uppercase needs to drop in size and gain tracking to stay readable — at
    // 15px the caps would shout over the card content they label.
    fontSize: typography.size.xs,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.neutral[600],
    marginTop: spacing.xs,
    // Nudged in to match the cards' *perceived* left edge. Headings and cards
    // share the same 24px gutter, but `shadows.card` blurs 12px outward, so a
    // card's visible boundary sits a few px inside its box while unshadowed text
    // starts flush at the gutter — which reads as the headings hanging out to the
    // left. Same inset the reminders/teleprompter sub-screens use.
    paddingHorizontal: spacing.xs,
  },
  reminderCard: {
    gap: spacing.sm,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  section: {
    gap: spacing.md,
  },
  // Sits inline at the right of the "Scroll speed" row per 1mh, so it hugs its
  // labels rather than stretching each pill to an equal share of the full width.
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[200],
    borderRadius: radii.pill,
    padding: 3,
  },
  // Explicit height rather than vertical padding: the pill then measures the same
  // regardless of the label's font metrics, and the track can't collapse thinner
  // than a comfortable tap target.
  segmentPill: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentPillActive: {
    backgroundColor: colors.accent.DEFAULT,
  },
  segmentLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.neutral[600],
  },
  segmentLabelActive: {
    color: colors.white,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  rowLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.text,
    flex: 1,
  },
  rowValue: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.body,
    color: colors.neutral[600],
    maxWidth: 160,
  },
  logoutLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.body,
    color: colors.accent.DEFAULT,
  },
});

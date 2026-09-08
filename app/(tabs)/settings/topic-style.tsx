import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';

import { RadioCircle } from '@/src/components/ui/icons';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import * as haptics from '@/src/lib/haptics';
import { supabase } from '@/src/lib/supabase';
import { TOPIC_STYLES } from '@/src/lib/topics';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radii, shadows, spacing, typography } from '@/src/theme/theme';

/**
 * Screens-spec 1mg. The topic vocabulary lives in `src/lib/topics.ts` because the
 * same labels are stored verbatim in `profiles.topic_preferences` and are also
 * offered by onboarding and the edit-script sheet — see the note there.
 */
export default function TopicStyle() {
  const { profile, user, refreshProfile } = useAuth();

  const selected = profile?.topic_preferences ?? [];

  const toggle = async (label: string) => {
    if (!user) return;
    haptics.select();
    const next = selected.includes(label)
      ? selected.filter((t) => t !== label)
      : [...selected, label];
    await supabase.from('profiles').update({ topic_preferences: next }).eq('id', user.id);
    await refreshProfile();
  };

  return (
    <View style={styles.container}>
      {/* ScreenHeader owns the top inset (white bar carrying up behind the status
          bar, per 1mg) and the tab bar already covers the bottom inset. */}
      <ScreenHeader title="Topic style" showBack />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.intro}>Pick one or more. Tomorrow&apos;s script follows the mix.</Text>

        <View style={styles.list}>
          {TOPIC_STYLES.map((topic, i) => {
            const isSelected = selected.includes(topic.label);
            return (
              <Pressable
                key={topic.label}
                onPress={() => toggle(topic.label)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                style={[styles.row, i === TOPIC_STYLES.length - 1 && styles.rowLast]}
              >
                <View style={styles.textCol}>
                  <Text style={styles.label}>{topic.label}</Text>
                  <Text style={styles.description}>{topic.description}</Text>
                </View>
                <RadioCircle selected={isSelected} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
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
  body: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  intro: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.neutral[700],
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  list: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.input,
    color: colors.text,
  },
  description: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.neutral[600],
  },
});

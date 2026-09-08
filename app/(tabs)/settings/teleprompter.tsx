import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DEFAULT_TELEPROMPTER_SPEED,
  DEFAULT_TELEPROMPTER_TEXT_SIZE,
  DEFAULT_TELEPROMPTER_ZOOM,
  SPEED_LABEL,
  TELEPROMPTER_SPEEDS,
  TELEPROMPTER_TEXT_SIZES,
  type TeleprompterSpeed,
  type TeleprompterTextSize,
} from '@/src/components/recording/Teleprompter';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import * as haptics from '@/src/lib/haptics';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radii, shadows, spacing, typography } from '@/src/theme/theme';

/** Zoom nudge per −/+ tap, matching the record screen's own zoom stepper. */
const ZOOM_STEP = 0.1;

/** Preview copy per 1mf — a fixed sample line, not the user's real script. */
const PREVIEW_TEXT = 'Imagine a ten-year-old asks what I do all day.';

/** The preview text scales with the chosen size so the card shows the actual effect. */
const PREVIEW_FONT_SIZE: Record<TeleprompterTextSize, number> = { M: 19, L: 22, XL: 26 };

/**
 * Screens-spec 1mf — Teleprompter defaults: live preview, scroll speed, text size and
 * default zoom. The third control is **default zoom**, which replaced an earlier
 * opacity slider; it seeds the record screen's camera zoom.
 */
export default function TeleprompterDefaults() {
  const { profile, user, refreshProfile } = useAuth();

  const speed = (profile?.teleprompter_speed as TeleprompterSpeed) ?? DEFAULT_TELEPROMPTER_SPEED;
  const textSize =
    (profile?.teleprompter_text_size as TeleprompterTextSize) ?? DEFAULT_TELEPROMPTER_TEXT_SIZE;
  const zoom = profile?.teleprompter_zoom ?? DEFAULT_TELEPROMPTER_ZOOM;

  const updateProfile = async (patch: Record<string, unknown>) => {
    if (!user) return;
    haptics.select();
    await supabase.from('profiles').update(patch).eq('id', user.id);
    await refreshProfile();
  };

  // Rounded before storing: repeated float steps otherwise drift to values like
  // 0.30000000000000004, which the percentage label would render as 30% but the
  // check constraint would still accept — better to keep the column tidy.
  const nudgeZoom = (delta: number) => {
    const next = Math.min(1, Math.max(0, Math.round((zoom + delta) * 10) / 10));
    if (next === zoom) return;
    updateProfile({ teleprompter_zoom: next });
  };

  return (
    <View style={styles.container}>
      {/* ScreenHeader owns the top inset; the tab bar covers the bottom one. */}
      <ScreenHeader title="Teleprompter" showBack />

      <View style={styles.body}>
        {/* Dark preview card — shows the chosen text size against the camera's
            near-black backdrop, the way it will actually appear while recording. */}
        <View style={styles.previewCard}>
          <View style={styles.previewChip}>
            <Text style={styles.previewChipText}>Preview</Text>
          </View>
          <Text style={[styles.previewText, { fontSize: PREVIEW_FONT_SIZE[textSize] }]}>
            {PREVIEW_TEXT}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Scroll speed</Text>
        <View style={styles.segmentCard}>
          {TELEPROMPTER_SPEEDS.map((option) => {
            const active = option === speed;
            return (
              <Pressable
                key={option}
                onPress={() => updateProfile({ teleprompter_speed: option })}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.segment, active && styles.segmentActive]}
              >
                <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                  {SPEED_LABEL[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Text size</Text>
        <View style={styles.segmentCard}>
          {TELEPROMPTER_TEXT_SIZES.map((option) => {
            const active = option === textSize;
            return (
              <Pressable
                key={option}
                onPress={() => updateProfile({ teleprompter_text_size: option })}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.segment, active && styles.segmentActive]}
              >
                <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Default zoom</Text>
        <View style={styles.zoomCard}>
          <Pressable
            onPress={() => nudgeZoom(-ZOOM_STEP)}
            disabled={zoom <= 0}
            hitSlop={8}
            accessibilityLabel="Decrease default zoom"
            style={[styles.zoomButton, zoom <= 0 && styles.zoomButtonDisabled]}
          >
            <Text style={styles.zoomButtonText}>−</Text>
          </Pressable>

          {/* Read-only fill indicating the stored value; the −/+ buttons are the
              control, so no gesture handling or slider dependency is needed. */}
          <View style={styles.zoomTrack}>
            <View style={[styles.zoomFill, { width: `${zoom * 100}%` }]} />
            <View style={[styles.zoomKnob, { left: `${zoom * 100}%` }]} />
          </View>

          <Pressable
            onPress={() => nudgeZoom(ZOOM_STEP)}
            disabled={zoom >= 1}
            hitSlop={8}
            accessibilityLabel="Increase default zoom"
            style={[styles.zoomButton, zoom >= 1 && styles.zoomButtonDisabled]}
          >
            <Text style={styles.zoomButtonText}>+</Text>
          </Pressable>

          <Text style={styles.zoomValue}>{Math.round(zoom * 100)}%</Text>
        </View>
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
  body: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  previewCard: {
    backgroundColor: colors.neutral[900],
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    minHeight: 170,
    justifyContent: 'center',
  },
  previewChip: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  previewChipText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.white,
  },
  previewText: {
    fontFamily: typography.fontFamily.extrabold,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 30,
  },
  // Uppercase letterspaced group heading, matching the other settings screens.
  sectionTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.xs,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: colors.neutral[600],
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  // Pill-in-a-card segmented control: the card is white, the active pill accent.
  segmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: spacing.xs,
    ...shadows.card,
  },
  segment: {
    flex: 1,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: colors.accent.DEFAULT,
  },
  segmentLabel: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.body,
    color: colors.neutral[700],
  },
  segmentLabelActive: {
    color: colors.white,
  },
  zoomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    height: 56,
    ...shadows.card,
  },
  zoomButton: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonDisabled: {
    opacity: 0.3,
  },
  zoomButtonText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.h4,
    color: colors.neutral[700],
  },
  zoomTrack: {
    flex: 1,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
  },
  zoomFill: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accent.DEFAULT,
  },
  zoomKnob: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.accent.DEFAULT,
    // Pulls the knob back by half its width so it centres on the fill's end
    // instead of starting at it.
    marginLeft: -8,
  },
  zoomValue: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.body,
    color: colors.text,
    minWidth: 42,
    textAlign: 'right',
  },
});

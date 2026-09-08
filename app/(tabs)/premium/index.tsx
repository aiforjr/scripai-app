import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { CheckIcon, FlameIcon } from '@/src/components/ui/icons';
import { useEntitlements } from '@/src/providers/EntitlementsProvider';
import { colors, radii, shadows, spacing, typography } from '@/src/theme/theme';

const FEATURES = [
  'AI scripts written for your topics',
  'Audio, video and combined review',
  'Leaderboard, streaks and badges',
  'AI call reminders',
  'Download every recording in full quality',
];

export default function PremiumIndex() {
  const router = useRouter();
  const { isPremium } = useEntitlements();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Premium" />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.goldCard}>
          <View style={styles.goldHeader}>
            <View style={styles.badge}>
              <FlameIcon size={30} color={colors.gold.button} />
            </View>
            <View style={styles.goldTitles}>
              <Text style={styles.goldHeading} numberOfLines={1}>
                ScripAI Premium
              </Text>
              <Text style={styles.goldSubtext} numberOfLines={1}>
                {isPremium ? 'Premium · active' : 'Free plan · 3-day trial available'}
              </Text>
            </View>
          </View>
          <Text style={styles.goldBody}>
            Everything you need to finish the 30-day challenge, unlocked.
          </Text>
        </View>

        <View style={styles.checklist}>
          {FEATURES.map((feature, index) => (
            <View
              key={feature}
              style={[styles.checkRow, index < FEATURES.length - 1 && styles.checkRowDivided]}
            >
              <CheckIcon size={18} color={colors.gold.button} strokeWidth={3} />
              <Text style={styles.checkLabel}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Pushes the CTA to the bottom of the viewport when the content is
            short, while still letting it scroll on smaller screens. */}
        <View style={styles.spacer} />

        {/* TEMPORARY: shown unconditionally so the trial sheet stays reachable
            from a premium account while the paywall is being built out. Restore
            the `!isPremium` branch (with "Manage subscription" for members)
            before ship. */}
        <Button
          title="Try for free"
          variant="gold"
          onPress={() => router.push('/(paywall)/trial-sheet')}
        />
        <Text style={styles.finePrint}>3 days free, then $69.99/year · Cancel any time</Text>
      </ScrollView>
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 14,
  },
  goldCard: {
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    gap: 14,
    backgroundColor: colors.gold.button,
    // Deliberately well past `shadows.card` (and `cardLg`) — the tokens are
    // tuned for a white surface and read as flat under the gold, so this card
    // is lifted hard above the white checklist below it.
    ...shadows.card,
    shadowOpacity: 0.28,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  goldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: radii.sm,
    // White tile against the gold card, with the flame in gold — the badge
    // reads as the card's focal point by inverting its surface.
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldTitles: {
    flex: 1,
    minWidth: 0,
  },
  goldHeading: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.size.h4,
    color: colors.white,
  },
  goldSubtext: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  goldBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.9)',
  },
  checklist: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    ...shadows.card,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
  },
  checkRowDivided: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
  },
  checkLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.text,
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  finePrint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.neutral[600],
    textAlign: 'center',
    marginTop: -4,
  },
});

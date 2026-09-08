import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { PlanRow } from '@/src/components/paywall/PlanRow';
import { Button } from '@/src/components/ui/Button';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radii, shadows, spacing, typography } from '@/src/theme/theme';

const TIMELINE = [
  {
    title: 'Today — first take',
    body: '3 days of full access, completely free',
  },
  {
    title: 'Day 2 — trial reminder',
    body: "We'll message you before anything is charged",
  },
  {
    title: 'Day 3 — keep going',
    body: 'Continue with full access or cancel any time',
  },
];

type PlanId = 'yearly' | 'monthly' | 'lifetime';

const PLANS: { id: PlanId; name: string; term: string; price: string }[] = [
  { id: 'yearly', name: 'Yearly', term: '12 mo · $69.99', price: '$5.83/mo' },
  {
    id: 'monthly',
    name: 'Monthly',
    term: '30 days · $9.99',
    price: '$9.99/mo',
  },
  { id: 'lifetime', name: 'Lifetime', term: 'One payment', price: '$119.99' },
];

export default function TrialSheet() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('yearly');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStartTrial() {
    if (submitting) return;
    setError(null);

    // The demo number never called `verifyOtp`, and `verifyOtp` is what mints a
    // session — so there is no `auth.uid()` here and the update below would be
    // rejected by RLS. Same bypass as `finish-account`: the flow completes
    // visually, which is the point, and nothing is persisted. `signup.phone` is
    // already cleared by then (finish-account calls `reset()`), so the missing
    // session is the only signal left to test.
    if (!user) {
      router.replace('/(tabs)/home');
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', user.id);

    if (updateError) {
      setSubmitting(false);
      setError('Something went wrong starting your trial. Please try again.');
      return;
    }

    await refreshProfile();
    router.replace('/(tabs)/home');
  }

  // Card chrome (rounded top corners, own background) lives on this screen
  // rather than the navigator so the sheet looks the same however it is
  // presented — Android and web render `presentation: 'modal'` as a plain
  // full-screen push, where the navigator would supply no card at all.
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Pressable onPress={() => router.back()} hitSlop={8} style={styles.closeButton}>
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Path
            d="M18 6 6 18M6 6l12 12"
            stroke={colors.text}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        </Svg>
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.heading}>How your free trial works</Text>
        <Text style={styles.subhead}>Nothing will be charged today</Text>

        <View style={styles.timeline}>
          {TIMELINE.map((step, i) => (
            <View key={step.title} style={styles.timelineRow}>
              <View style={styles.timelineMarkerCol}>
                <View style={styles.timelineDot}>
                  <Text style={styles.timelineDotText}>{i + 1}</Text>
                </View>
                {i < TIMELINE.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineText}>
                <Text style={styles.timelineTitle}>{step.title}</Text>
                <Text style={styles.timelineBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Design `1pd`: the timeline sits under the heading and the plan
            selector is pushed down to meet the CTA. */}
        <View style={styles.spacer} />

        <View style={styles.plans}>
          {PLANS.map((plan) => (
            <PlanRow
              key={plan.id}
              name={plan.name}
              term={plan.term}
              price={plan.price}
              selected={selectedPlan === plan.id}
              onPress={() => setSelectedPlan(plan.id)}
            />
          ))}
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Button
        title="Start 3-day free trial"
        variant="primary"
        disabled={submitting}
        onPress={handleStartTrial}
      />
      <Text style={styles.finePrint}>$69.99/year ($5.83/mo), billed after the trial</Text>

      <View style={styles.footer}>
        <Text style={styles.footerLink}>Restore Purchases</Text>
        <Text style={styles.footerLink}>Terms</Text>
        <Text style={styles.footerLink}>Privacy</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    overflow: 'hidden',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  content: {
    flex: 1,
    paddingTop: spacing.lg,
  },
  heading: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.size.h2,
    color: colors.text,
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subhead: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.neutral[700],
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  timeline: {
    // Shrink-to-fit so the block can centre as a unit: the rows size to the
    // widest step's text rather than filling the sheet.
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  spacer: {
    flex: 1,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineMarkerCol: {
    alignItems: 'center',
    width: 28,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.accent.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 13,
    color: colors.white,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    minHeight: 8,
    backgroundColor: colors.accent[200],
    marginVertical: 2,
  },
  timelineText: {
    // No `flex: 1` here — it would stretch each row to the full sheet width and
    // defeat the wrapper's shrink-to-fit centring.
    flexShrink: 1,
    paddingBottom: spacing.xxl,
  },
  timelineTitle: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: 15,
    color: colors.text,
    marginBottom: 2,
  },
  timelineBody: {
    fontFamily: typography.fontFamily.regular,
    fontSize: 13,
    color: colors.neutral[600],
    lineHeight: 18,
  },
  plans: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.sm,
    color: colors.accent[700],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  finePrint: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.neutral[600],
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  footerLink: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.xs,
    color: colors.neutral[600],
  },
});

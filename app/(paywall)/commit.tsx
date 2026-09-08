import { useRouter } from 'expo-router';
import { FingerprintPattern } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { OnboardingBadge } from '@/src/components/ui/OnboardingBadge';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { StepHeader } from '@/src/components/ui/StepHeader';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, spacing, typography } from '@/src/theme/theme';

const HOLD_DURATION_MS = 1500;
const TICK_MS = 50;

// Lucide strokes are authored against a 24-unit grid, so the default width of 2
// renders as a hairline once the icon is scaled up to ~100px. Scaling the width
// with the size keeps the mockup's heavy thumbprint ridges at any size.
// Set above the lucide default of 2: white-on-accent thins the ridges optically,
// so the grid width has to run heavier here than it would on a light ground.
const ICON_GRID = 24;
const ICON_STROKE_ON_GRID = 5;

// Ring geometry from design `1ak`: a 200×200 ring, 6px stroke at r=94, with the
// accent disc inset 16px inside it.
const RING_SIZE = 200;
const RING_STROKE = 6;
const RING_RADIUS = 94;
const RING_INSET = 16;
const DISC_SIZE = RING_SIZE - RING_INSET * 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// The flow's progress bar continues through the paywall: 20% at rest, 40% while
// holding (`1al`), then 60% on trial-offer and 100% on features.
const PROGRESS_IDLE = 0.2;
const PROGRESS_HOLDING = 0.4;

export default function Commit() {
  const router = useRouter();
  const { profile } = useAuth();
  const [holdProgress, setHoldProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearHoldInterval() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function handlePressIn() {
    clearHoldInterval();
    const step = TICK_MS / HOLD_DURATION_MS;
    intervalRef.current = setInterval(() => {
      setHoldProgress((prev) => {
        const next = prev + step;
        if (next >= 1) {
          clearHoldInterval();
          return 1;
        }
        return next;
      });
    }, TICK_MS);
  }

  function handlePressOut() {
    clearHoldInterval();
    setHoldProgress((prev) => (prev >= 1 ? prev : 0));
  }

  useEffect(() => () => clearHoldInterval(), []);

  // Navigating here (rather than from inside the setHoldProgress updater above)
  // avoids "Cannot update a component while rendering a different component" —
  // router.replace must run as its own effect, not synchronously during the
  // state update that completes the hold.
  useEffect(() => {
    if (holdProgress >= 1) {
      router.replace('/(paywall)/trial-offer');
    }
  }, [holdProgress, router]);

  const dashOffset = RING_CIRCUMFERENCE * (1 - holdProgress);
  const scale = 0.94 + holdProgress * 0.06;
  const iconSize = holdProgress > 0 ? 108 : 96;
  const name = profile?.name || 'friend';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ProgressBar progress={holdProgress > 0 ? PROGRESS_HOLDING : PROGRESS_IDLE} />
      <StepHeader title="Commit" showBack={false} />
      <OnboardingBadge center />

      <View style={styles.content}>
        <Text style={styles.heading}>
          I, {name}, commit to show up every day for the next 30 days to complete the
          talking-to-camera challenge.
        </Text>

        <View style={styles.fingerprintWrap}>
          <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} hitSlop={16}>
            <View style={styles.ringBox}>
              <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={colors.accent[200]}
                  strokeWidth={RING_STROKE}
                  fill="none"
                />
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={colors.accent.DEFAULT}
                  strokeWidth={RING_STROKE}
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  fill="none"
                  // Starts the sweep at 12 o'clock. Written as an SVG transform
                  // string rather than rotation/originX/originY: on web that
                  // prop trio is shimmed into a `transform-origin` DOM
                  // attribute, which React DOM rejects for its casing.
                  transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                />
              </Svg>
              <View
                style={[
                  styles.circle,
                  { transform: [{ scale }], shadowOpacity: 0.35 + holdProgress * 0.2 },
                ]}
              >
                <FingerprintPattern
                  size={iconSize}
                  color={colors.white}
                  strokeWidth={(ICON_STROKE_ON_GRID * ICON_GRID) / iconSize}
                />
              </View>
            </View>
          </Pressable>
        </View>

        <Text style={styles.caption}>
          {holdProgress > 0 ? (
            'Keep holding…'
          ) : (
            <>
              Tap and hold the fingerprint <Text style={styles.captionBold}>to commit.</Text>
            </>
          )}
        </Text>
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  heading: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.size.h3,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  fingerprintWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBox: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSvg: {
    position: 'absolute',
  },
  circle: {
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: DISC_SIZE / 2,
    backgroundColor: colors.accent.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent.DEFAULT,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  caption: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.neutral[700],
    textAlign: 'center',
  },
  captionBold: {
    fontFamily: typography.fontFamily.semibold,
    color: colors.text,
  },
});

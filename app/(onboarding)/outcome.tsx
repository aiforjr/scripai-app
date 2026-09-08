import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';

import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { CheckIcon } from '@/src/components/ui/icons';
import { OnboardingBadge } from '@/src/components/ui/OnboardingBadge';
import { ProgressBar } from '@/src/components/ui/ProgressBar';
import { StepHeader } from '@/src/components/ui/StepHeader';
import { colors, radii, spacing, typography } from '@/src/theme/theme';

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Chart geometry in the card's 308x100 viewBox — a rising line from "Today" to
// "Day 30". Y is inverted (smaller = higher), so the values descend.
const CHART_POINTS = [
  { x: 8, y: 88 },
  { x: 80, y: 76 },
  { x: 152, y: 53 },
  { x: 224, y: 32 },
  { x: 296, y: 12 },
];

const X_AXIS_LABELS = ['Today', 'Day 10', 'Day 20', 'Day 30'];

// Gridlines sit behind the line at the two heights the mockup shows — enough to
// give the rise something to read against without drawing a full axis.
const GRIDLINE_YS = [12, 53];

const CHART_BASELINE_Y = 96;

/**
 * Rendered height of the plot. The viewBox stays 308x100 and scales uniformly, so
 * this only sets how tall the chart sits in the card — the dots stay circular and
 * the stroke keeps its weight.
 */
const CHART_HEIGHT = 132;

const OUTCOMES = [
  'You will not have camera fear.',
  'You will have a discipline.',
  'You will show grit for 30 days.',
];

/**
 * Total length of the plotted line, used as the dash offset the draw-on animation
 * retracts to zero. Computed rather than measured so it needs no layout pass.
 */
const LINE_LENGTH = CHART_POINTS.reduce((total, point, i) => {
  if (i === 0) return 0;
  const prev = CHART_POINTS[i - 1];
  return total + Math.hypot(point.x - prev.x, point.y - prev.y);
}, 0);

const LINE_DRAW_MS = 900;
/** Each dot lands as the line reaches it, so the two read as one gesture. */
const DOT_STEP_MS = LINE_DRAW_MS / (CHART_POINTS.length - 1);
const AREA_FADE_MS = 500;
const CARD_STAGGER_MS = 90;

/** A dot that pops in once the drawing line reaches its x position. */
function ChartDot({
  point,
  delayMs,
  isLast,
  animate,
}: {
  point: { x: number; y: number };
  delayMs: number;
  isLast: boolean;
  animate: boolean;
}) {
  // The endpoint is solid and larger — it's the payoff the whole line builds to.
  const radius = isLast ? 8 : 5;
  const scale = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    scale.value = withDelay(
      delayMs,
      withTiming(1, { duration: 260, easing: Easing.out(Easing.back(2)) }),
    );
  }, [animate, delayMs, scale]);

  const animatedProps = useAnimatedProps(() => ({ r: radius * scale.value }));

  return (
    <AnimatedCircle
      cx={point.x}
      cy={point.y}
      fill={isLast ? colors.accent.DEFAULT : colors.white}
      stroke={colors.accent.DEFAULT}
      strokeWidth={3}
      animatedProps={animatedProps}
    />
  );
}

export default function Outcome() {
  const router = useRouter();

  const [animate, setAnimate] = useState<boolean | null>(null);

  // `reduce motion` renders the finished chart directly — no draw-on, no stagger.
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!cancelled) setAnimate(!reduceMotion);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const polylinePoints = useMemo(() => CHART_POINTS.map((p) => `${p.x},${p.y}`).join(' '), []);

  // The tinted region under the line: the line itself, closed down to the
  // baseline and back to the start.
  const areaPath = useMemo(() => {
    const first = CHART_POINTS[0];
    const last = CHART_POINTS[CHART_POINTS.length - 1];
    const line = CHART_POINTS.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    return `${line} L${last.x},${CHART_BASELINE_Y} L${first.x},${CHART_BASELINE_Y} Z`;
  }, []);

  const drawProgress = useSharedValue(0);
  const areaOpacity = useSharedValue(0);

  useEffect(() => {
    if (animate === null) return;
    if (!animate) {
      drawProgress.value = 1;
      areaOpacity.value = 1;
      return;
    }
    drawProgress.value = withTiming(1, {
      duration: LINE_DRAW_MS,
      easing: Easing.inOut(Easing.cubic),
    });
    // Fills in behind the line once it is mostly drawn, so the tint never runs
    // ahead of the stroke that bounds it.
    areaOpacity.value = withDelay(LINE_DRAW_MS * 0.5, withTiming(1, { duration: AREA_FADE_MS }));
  }, [animate, drawProgress, areaOpacity]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: LINE_LENGTH * (1 - drawProgress.value),
  }));

  const areaProps = useAnimatedProps(() => ({
    fillOpacity: areaOpacity.value,
  }));

  // Held until the reduce-motion check resolves, so the chart is never drawn
  // twice under two different rules.
  if (animate === null) return <SafeAreaView style={styles.container} edges={['top', 'bottom']} />;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ProgressBar progress={1} />
      <StepHeader />

      <View style={styles.content}>
        <OnboardingBadge />
        <Text style={styles.heading}>If you commit for 30 days</Text>
        <Text style={styles.subhead}>This is what happens.</Text>

        <Card style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartLabel}>Camera confidence</Text>
            <Text style={styles.chartStat}>+82%</Text>
          </View>

          <Svg width="100%" height={CHART_HEIGHT} viewBox="0 0 308 100">
            {GRIDLINE_YS.map((y) => (
              <Line
                key={y}
                x1={8}
                y1={y}
                x2={300}
                y2={y}
                stroke={colors.neutral[200]}
                strokeWidth={1}
              />
            ))}

            <AnimatedPath d={areaPath} fill={colors.accent[100]} animatedProps={areaProps} />

            <AnimatedPolyline
              points={polylinePoints}
              fill="none"
              stroke={colors.accent.DEFAULT}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={LINE_LENGTH}
              animatedProps={lineProps}
            />

            {CHART_POINTS.map((p, i) => (
              <ChartDot
                key={p.x}
                point={p}
                delayMs={i * DOT_STEP_MS}
                isLast={i === CHART_POINTS.length - 1}
                animate={animate}
              />
            ))}
          </Svg>

          <View style={styles.xAxisRow}>
            {X_AXIS_LABELS.map((label) => (
              <Text key={label} style={styles.xAxisLabel}>
                {label}
              </Text>
            ))}
          </View>
        </Card>

        <View style={styles.outcomeCards}>
          {OUTCOMES.map((outcome, i) => (
            <Animated.View
              key={outcome}
              // Each card arrives after the chart has finished drawing, one after
              // the next, so the three read in order rather than as one block.
              entering={
                animate
                  ? FadeInDown.delay(LINE_DRAW_MS + i * CARD_STAGGER_MS)
                      .duration(320)
                      .springify()
                      .damping(18)
                  : undefined
              }
            >
              <Card>
                <View style={styles.outcomeRow}>
                  <View style={styles.checkBadge}>
                    <CheckIcon size={12} color={colors.white} strokeWidth={3} />
                  </View>
                  <Text style={styles.outcomeText}>{outcome}</Text>
                </View>
              </Card>
            </Animated.View>
          ))}
        </View>
      </View>

      <Button
        title="Next"
        variant="primary"
        onPress={() => router.push('/(auth)/create-account')}
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
  // Gap to the outcome list below matches the gap between the outcome cards'
  // siblings on the previous step — the plain Card supplies radius, padding and
  // shadow, so only the spacing is set here.
  chartCard: {
    marginBottom: spacing.lg,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    color: colors.neutral[700],
  },
  chartStat: {
    fontFamily: typography.fontFamily.extrabold,
    fontSize: typography.size.h4,
    color: colors.accent.DEFAULT,
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xAxisLabel: {
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.sm,
    color: colors.neutral[500],
  },
  outcomeCards: {
    gap: spacing.md,
  },
  outcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  // Filled accent disc with a white tick, per the mockup — a bare accent tick
  // read as too light next to the card's text weight.
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.accent.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeText: {
    flex: 1,
    fontFamily: typography.fontFamily.semibold,
    fontSize: typography.size.input,
    color: colors.text,
  },
});

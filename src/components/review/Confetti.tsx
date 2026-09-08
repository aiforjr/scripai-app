import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

import { colors } from '@/src/theme/theme';

const { width, height } = Dimensions.get('window');
const PARTICLE_COLORS = [
  colors.accent.DEFAULT,
  colors.accent[400],
  colors.gold.light,
  colors.gold.button,
  colors.neutral[400],
  colors.neutral[700],
];
const PER_SIDE = 16;

interface ConfettiProps {
  centerY?: number;
  spreadY?: number;
  /**
   * `cannons` (default) fires inward from the left and right edges — the review
   * dialog's burst. `top` rains down across the full width from above the screen,
   * for a milestone that belongs to the whole page rather than to one card.
   */
  origin?: 'cannons' | 'top';
}

/**
 * In `cannons` mode two cannons fire inward from the left and right edges, arc over
 * the dialog and fall toward the target line — the "Done for the day" button — so
 * the burst scatters over the dialog rather than raining down uniformly.
 *
 * `centerY` is the dialog's vertical middle as a fraction of screen height;
 * particles come to rest spread around it, the way the mockup shows them
 * strewn across the card and the Done button. It is unused in `top` mode, where
 * particles fall past the bottom of the screen instead of settling.
 */
export function Confetti({ centerY = 0.5, spreadY = 0.34, origin = 'cannons' }: ConfettiProps) {
  const particles = useRef(
    Array.from({ length: PER_SIDE * 2 }, (_, i) => {
      if (origin === 'top') {
        // Spread launch points across the width in even bands, jittered inside each,
        // so the fall covers the screen without the clumps pure random would give.
        const band = (i + Math.random()) / (PER_SIDE * 2);
        const startX = width * band;
        const startY = -30 - Math.random() * 120;
        return {
          anim: new Animated.Value(0),
          startX,
          startY,
          // Drifts sideways a little on the way down rather than dropping plumb.
          endX: startX + (Math.random() - 0.5) * width * 0.3,
          // Falls clear past the bottom edge — nothing settles on screen.
          endY: height + 60,
          arcLift: 0,
          rotate: (Math.random() - 0.5) * 900,
          color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
          // Staggered widely so the fall reads as a shower with a tail, not one sheet.
          delay: Math.random() * 900,
          size: 6 + Math.random() * 7,
          round: Math.random() < 0.35,
        };
      }

      const fromLeft = i < PER_SIDE;
      // Launch from just off the matching edge, around the dialog's midline.
      const startX = fromLeft ? -20 : width + 20;
      const startY = height * (centerY - 0.06 + Math.random() * 0.12);
      // Rest anywhere across the card's width — some barely clear the edge,
      // others sail past the middle, which is what makes the scatter read as
      // a burst rather than a funnel.
      const reach = 0.12 + Math.random() * 0.78;
      const endX = fromLeft ? width * reach : width * (1 - reach);
      // ...and anywhere down the card's height, not on one target line.
      const endY = height * (centerY + (Math.random() - 0.5) * spreadY * 2);
      // Peak of the arc, above the straight line between start and end.
      const arcLift = 70 + Math.random() * 150;

      return {
        anim: new Animated.Value(0),
        startX,
        startY,
        endX,
        endY,
        arcLift,
        rotate: (Math.random() - 0.5) * 900,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        delay: Math.random() * 260,
        size: 6 + Math.random() * 7,
        round: Math.random() < 0.35,
      };
    }),
  ).current;

  useEffect(() => {
    const animations = particles.map((p) =>
      Animated.timing(p.anim, {
        toValue: 1,
        duration: 1500 + Math.random() * 500,
        delay: p.delay,
        // A fall keeps gathering speed, so it eases in; a cannon shot is fastest at
        // the muzzle and eases out.
        easing: origin === 'top' ? Easing.in(Easing.quad) : Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    Animated.parallel(animations).start();
  }, [particles, origin]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width: p.size,
              height: p.round ? p.size : p.size * 1.8,
              borderRadius: p.round ? p.size / 2 : 2,
              backgroundColor: p.color,
              left: p.startX,
              top: p.startY,
              // Cannons fade in on launch and stay: the burst settles onto the card
              // rather than vanishing, so the dialog keeps the mockup's look after
              // the motion finishes. A top fall instead fades out near the bottom so
              // particles don't visibly stack up at the screen edge.
              opacity:
                origin === 'top'
                  ? p.anim.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] })
                  : p.anim.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 1, 1] }),
              transform: [
                {
                  translateX: p.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, p.endX - p.startX],
                  }),
                },
                {
                  // Cannons arc — lift on the way out, then fall past it to the
                  // target. A top fall runs straight down, so it needs no lift keyframe.
                  translateY:
                    origin === 'top'
                      ? p.anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, p.endY - p.startY],
                        })
                      : p.anim.interpolate({
                          inputRange: [0, 0.45, 1],
                          outputRange: [0, -p.arcLift, p.endY - p.startY],
                        }),
                },
                {
                  rotate: p.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${p.rotate}deg`],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
  },
});

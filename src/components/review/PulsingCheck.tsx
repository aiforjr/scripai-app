import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { CheckIcon } from '@/src/components/ui/icons';
import { colors } from '@/src/theme/theme';

const BADGE = 96;
const RING = 150;

/**
 * The celebration dialog's check mark: the badge pops in once, then a ring
 * ripples out from behind it on a loop.
 *
 * Mirrors the design system's `ck-pop` (scale 0 → 1.15 → 0.95 → 1) and
 * `ck-ripple` (scale 0.6 → 1.9 while fading out) keyframes.
 */
export function PulsingCheck() {
  const pop = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pop, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.back(2)),
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.timing(ripple, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pop, ripple]);

  return (
    <View style={styles.wrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ripple,
          {
            opacity: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
            transform: [
              { scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.9] }) },
            ],
          },
        ]}
      />
      <Animated.View style={[styles.badge, { transform: [{ scale: pop }] }]}>
        <CheckIcon size={44} color={colors.white} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ripple: {
    position: 'absolute',
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: colors.accent[200],
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: colors.accent.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

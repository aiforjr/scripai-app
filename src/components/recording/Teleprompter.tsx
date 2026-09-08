import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScriptAreaFade } from '@/src/components/recording/ScriptAreaFade';
import { RECORDING_DURATION_MS } from '@/src/lib/recording';
import { typography } from '@/src/theme/theme';

export type TeleprompterSpeed = 'slow' | 'medium' | 'fast';
export type TeleprompterTextSize = 'M' | 'L' | 'XL';

/**
 * The teleprompter preference vocabulary, exported so the settings screens, the
 * record screen and this component all agree. These used to be re-declared inline
 * per screen, which had drifted: the settings index fell back to 'M' while the
 * column defaults to 'L', and the record screen's picker offered a different set
 * than settings could store.
 *
 * There is deliberately no 'S': at arm's length a 16px teleprompter line is not
 * readable while speaking, so Medium is the floor. 0006 migrates anyone already on
 * 'S' up to 'M' and drops it from the column's check constraint.
 *
 * `DEFAULT_*` mirror the `profiles` column defaults in 0001_init.sql — keep them in
 * step with that migration, not with each screen's own guess.
 */
export const TELEPROMPTER_SPEEDS: readonly TeleprompterSpeed[] = ['slow', 'medium', 'fast'];
export const TELEPROMPTER_TEXT_SIZES: readonly TeleprompterTextSize[] = ['M', 'L', 'XL'];

export const DEFAULT_TELEPROMPTER_SPEED: TeleprompterSpeed = 'medium';
export const DEFAULT_TELEPROMPTER_TEXT_SIZE: TeleprompterTextSize = 'L';
/** 1mf "Default zoom" — matches `profiles.teleprompter_zoom`'s 0 default. */
export const DEFAULT_TELEPROMPTER_ZOOM = 0;

/** Short segmented-control label ("Med") vs the full row value ("Medium"). */
export const SPEED_SHORT_LABEL: Record<TeleprompterSpeed, string> = {
  slow: 'Slow',
  medium: 'Med',
  fast: 'Fast',
};
export const SPEED_LABEL: Record<TeleprompterSpeed, string> = {
  slow: 'Slow',
  medium: 'Medium',
  fast: 'Fast',
};
export const TEXT_SIZE_LABEL: Record<TeleprompterTextSize, string> = {
  M: 'Medium',
  L: 'Large',
  XL: 'Extra large',
};

const SPEED_MULTIPLIER: Record<TeleprompterSpeed, number> = { slow: 0.7, medium: 1, fast: 1.4 };
const FONT_SIZE: Record<TeleprompterTextSize, number> = { M: 19, L: 22, XL: 26 };

interface TeleprompterProps {
  scriptText: string;
  speed: TeleprompterSpeed;
  textSize: TeleprompterTextSize;
  isScrolling: boolean;
  durationMs?: number;
}

export function Teleprompter({
  scriptText,
  speed,
  textSize,
  isScrolling,
  durationMs = RECORDING_DURATION_MS,
}: TeleprompterProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  // Our own record of the current scroll offset — the ScrollView is
  // `scrollEnabled={false}` (position is driven programmatically, either by
  // the auto-scroll tick below or by the drag gesture), so there's no native
  // scroll state to read back from.
  const currentYRef = useRef(0);
  const dragBaseYRef = useRef(0);
  // True while a finger is down on the script. The auto-scroll tick below bails
  // out on it: without that, the tick would overwrite the drag's `scrollTo` on
  // its next 80ms beat and the script would snap back under the finger.
  const isDraggingRef = useRef(false);

  const maxScroll = Math.max(0, contentHeight - containerHeight);

  useEffect(() => {
    if (!isScrolling) {
      startTimeRef.current = null;
      if (rafRef.current) clearInterval(rafRef.current);
      return;
    }
    // Resume from wherever the script currently sits (e.g. after a manual
    // drag) rather than snapping back to a purely time-based position.
    const startProgress = maxScroll > 0 ? currentYRef.current / maxScroll : 0;
    startTimeRef.current = Date.now() - (startProgress * durationMs) / SPEED_MULTIPLIER[speed];

    rafRef.current = setInterval(() => {
      if (!startTimeRef.current) return;
      // Hands off while the user is scrubbing by hand.
      if (isDraggingRef.current) return;
      const elapsed = (Date.now() - startTimeRef.current) * SPEED_MULTIPLIER[speed];
      const progress = Math.min(1, elapsed / durationMs);
      const y = progress * maxScroll;
      currentYRef.current = y;
      scrollRef.current?.scrollTo({ y, animated: false });
    }, 80) as unknown as number;

    return () => {
      if (rafRef.current) clearInterval(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScrolling, speed, durationMs, maxScroll]);

  // Drag up/down to scrub through the script by hand. On release, auto-scroll
  // (the effect above) picks back up from wherever the drag left off, at
  // whatever pace is currently selected — it doesn't jump back.
  const endDrag = useCallback(() => {
    isDraggingRef.current = false;
    if (!isScrolling) return;
    // Re-seat the clock so the still-running interval's next tick continues
    // from where the finger left off instead of jumping to where time says the
    // script "should" be.
    const progress = maxScroll > 0 ? currentYRef.current / maxScroll : 0;
    startTimeRef.current = Date.now() - (progress * durationMs) / SPEED_MULTIPLIER[speed];
  }, [isScrolling, maxScroll, durationMs, speed]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gestureState) => Math.abs(gestureState.dy) > 2,
        onPanResponderGrant: () => {
          dragBaseYRef.current = currentYRef.current;
          isDraggingRef.current = true;
        },
        onPanResponderMove: (_evt, gestureState) => {
          const y = Math.max(0, Math.min(maxScroll, dragBaseYRef.current - gestureState.dy));
          currentYRef.current = y;
          scrollRef.current?.scrollTo({ y, animated: false });
        },
        onPanResponderRelease: () => endDrag(),
        // A cancelled gesture (another responder steals the touch) fires
        // terminate, not release. Without this the flag would stay set and
        // auto-scroll would be frozen for the rest of the take.
        onPanResponderTerminate: () => endDrag(),
      }),
    [maxScroll, endDrag],
  );

  return (
    <View
      style={styles.container}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
      {...panResponder.panHandlers}
    >
      <ScrollView
        ref={scrollRef}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={(_, h) => setContentHeight(h)}
      >
        <Text
          style={[
            styles.text,
            { fontSize: FONT_SIZE[textSize], lineHeight: FONT_SIZE[textSize] * 1.45 },
          ]}
        >
          {scriptText}
        </Text>
      </ScrollView>
      <ScriptAreaFade />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  text: {
    fontFamily: typography.fontFamily.semibold,
    color: 'rgba(255,255,255,0.94)',
    textAlign: 'center',
    paddingHorizontal: 28,
    paddingVertical: 120,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 6,
  },
});

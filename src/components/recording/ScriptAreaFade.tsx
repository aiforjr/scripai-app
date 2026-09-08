import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

// Cosine-eased alpha stops (slope ~0 at both ends) instead of a flat 2-stop
// gradient, so the fade blends in without a visible line at either edge. The
// peak (0.45) matches the record screen's topBar/bottomArea scrim exactly,
// so the far edge is a value match against a flat panel, not a jump to bare
// camera — that jump, not the gradient shape, was what read as a hard line.
const FADE_LOCATIONS = [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1] as const;
const FADE_STOPS_TOP = [
  'rgba(0,0,0,0.45)',
  'rgba(0,0,0,0.43)',
  'rgba(0,0,0,0.36)',
  'rgba(0,0,0,0.23)',
  'rgba(0,0,0,0.09)',
  'rgba(0,0,0,0.02)',
  'rgba(0,0,0,0)',
] as const;
const FADE_STOPS_BOTTOM = [
  'rgba(0,0,0,0)',
  'rgba(0,0,0,0.02)',
  'rgba(0,0,0,0.09)',
  'rgba(0,0,0,0.23)',
  'rgba(0,0,0,0.36)',
  'rgba(0,0,0,0.43)',
  'rgba(0,0,0,0.45)',
] as const;

/**
 * The top/bottom scrim fades that bridge the script area into the record
 * screen's control bars.
 *
 * Rendered by every state that occupies the script area — the teleprompter, the
 * loading spinner and the generation-error message alike — so the camera view
 * never jumps to bare, unscrimmed video just because there's no script yet.
 *
 * A plain 2-stop gradient has a sudden slope change right where it meets the
 * flat area beyond it — the eye reads that kink as a hard edge (Mach banding)
 * even though the alpha itself is continuous. The extra eased stops bring the
 * slope to ~0 at both ends so the fade reads as smooth instead of a cut line.
 */
export function ScriptAreaFade() {
  return (
    <>
      <LinearGradient
        colors={FADE_STOPS_TOP}
        locations={FADE_LOCATIONS}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.fadeTop}
        pointerEvents="none"
      />
      <LinearGradient
        colors={FADE_STOPS_BOTTOM}
        locations={FADE_LOCATIONS}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.fadeBottom}
        pointerEvents="none"
      />
    </>
  );
}

const styles = StyleSheet.create({
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
});

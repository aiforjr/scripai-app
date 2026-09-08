import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Thin wrapper over `expo-haptics` giving the UI three named weights instead of
 * raw enum members, so tap feedback stays consistent across components.
 *
 * Two deliberate properties:
 *  - **No-op on web.** Only `selectionAsync` claims web support, and there it
 *    routes through the Vibration API, which most desktop browsers ignore and
 *    some mobile browsers gate behind a user-gesture heuristic. Skipping the
 *    platform entirely keeps behaviour predictable rather than device-dependent.
 *  - **Never throws.** These are fire-and-forget: a device without a haptics
 *    engine (or a simulator) rejects the promise, and an unhandled rejection
 *    inside an `onPress` would surface as a red-box in dev. Feedback is
 *    decorative, so a failure must never take the actual action down with it.
 */

function fire(run: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  run().catch(() => {});
}

/** Selection changed — chips, radio rows, toggles, tab switches. */
export function select() {
  fire(() => Haptics.selectionAsync());
}

/** Light tap — lesser affordances such as a header back/skip button. */
export function tap() {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Medium impact — primary actions (Next, Save, Record, Start trial). */
export function heavy() {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

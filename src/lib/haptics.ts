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
 *  - **Two vocabularies, deliberately.** `select`/`tap`/`heavy` name a _weight_
 *    and belong on presses; `success`/`warning`/`error` name an _outcome_ and
 *    belong on the moment a task resolves, not on the press that started it. A
 *    press that kicks off async work gets both — the impact on touch, the
 *    notification when it lands.
 *
 * Note: `performAndroidHapticsAsync` is the escape hatch if Android feel is ever
 * judged wrong. It needs a `Platform.OS === 'android'` branch inside every
 * wrapper and has no cross-platform analogue, so it is not built speculatively.
 */

// Mirrors the user's Settings toggle. A module-level flag rather than React state
// because these functions are called from plain handlers and non-component code;
// threading a hook through every call site would be a large change for one boolean.
// `true` until hydration finishes so the very first tap isn't silently dropped.
let enabled = true;

/** Called once at startup and on every change of the Settings toggle. */
export function setEnabled(next: boolean) {
  enabled = next;
}

function fire(run: () => Promise<void>) {
  if (!enabled) return;
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

/** Task completed — day complete, review phase done, OTP verified, trial started. */
export function success() {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Task refused but recoverable — a gated action, a disabled affordance. */
export function warning() {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

/** Task failed — upload error, wrong OTP, a surfaced Alert. */
export function error() {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

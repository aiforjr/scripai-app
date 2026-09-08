# Haptic Feedback — Full Coverage Plan

## Context

Haptics are **already partly built** in this app, which reframes the task: this is a
completion-and-audit pass, not a greenfield introduction.

What exists today:

- `expo-haptics ~57.0.2` is already in [package.json](package.json) — matches SDK 57, **no install needed**.
- [src/lib/haptics.ts](src/lib/haptics.ts) already wraps it with three named weights —
  `select()` (selectionAsync), `tap()` (impact Light), `heavy()` (impact Medium) — and two
  deliberate properties documented in its header: **no-op on web** and **never throws**
  (rejections swallowed so decorative feedback can never take down the real action).
- Roughly a dozen shared components already call it: `ui/Button` (via a `haptic` prop),
  `ui/Chip`, `ui/RadioOption`, `ui/ToggleRow`, `ui/ScreenHeader`, `ui/StepHeader`,
  `auth/ProviderSignInSheet`, `auth/SocialAuthButtons`, `paywall/PlanRow`, the tab bar's
  `HapticTabButton`, and two settings screens.

The three real gaps:

1. **No outcome vocabulary.** `Haptics.notificationAsync` (Success / Warning / Error) is
   completely unused. Every existing export names a _weight_, not a _meaning_, so the app
   has no way to signal that something **finished** or **failed** — which is exactly what
   the day-complete, streak bump, OTP verify, and upload-failure moments need.
2. **Bare `Pressable`s in screens are silent.** Interaction that goes through a shared
   primitive feels responsive; interaction written inline in a screen does not. The result
   is inconsistent — `record`, `review`, `settings/index`, `EditScriptModal`,
   `MonthCalendar`, and the auth screens have no feedback at all.
3. **No way to turn it off.** Broadening haptics across the whole app without a switch is a
   regression for anyone who finds them distracting. The OS-level toggle exists but is
   all-or-nothing across every app, so the setting has to live here too (§7).

Intended outcome: every meaningful touch and every task resolution has feedback, driven by
one small semantic vocabulary, with the biggest emotional beat of the product — finishing
the day — actually feeling like something happened, and a single user-facing switch that
silences all of it.

**Scope decision:** full coverage (primitives → moments → long tail) plus the settings toggle.

---

## 1. Extend the wrapper — three exports become six

**File: [src/lib/haptics.ts](src/lib/haptics.ts)**

Add three outcome functions alongside the existing three weights. They route through the
existing `fire()` helper, so the web no-op and rejection-swallowing come free.

```ts
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
```

Add one bullet to the file's existing doc block, matching its tone:

> - **Two vocabularies, deliberately.** `select`/`tap`/`heavy` name a _weight_ and belong on
>   presses; `success`/`warning`/`error` name an _outcome_ and belong on the moment a task
>   resolves, not on the press that started it. A press that kicks off async work gets both —
>   the impact on touch, the notification when it lands.

That last sentence is the rule preventing the most likely misuse: double-firing on one gesture.

### The user-preference gate

The toggle (§7) is honoured **inside `fire()`**, next to the existing web guard — so all ~40
existing and planned call sites keep working untouched and none of them can forget to check it:

```ts
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
```

Two consequences worth stating: the preference is read **at call time**, so a change takes
effect immediately with no remount; and because `setEnabled` is the only writer, the store
(§7) is the single source of truth and the wrapper stays free of imports from React or storage.

**Deliberately not added:**

- A fourth impact weight (`Heavy`/`Rigid`/`Soft`). Nothing in the app wants one, and adding
  a real `Heavy` would make the existing `heavy()` (which is actually `Medium`) a lie and
  force a rename cascade. Leave the quirk as-is.
- `performAndroidHapticsAsync`. It needs a `Platform.OS === 'android'` branch inside every
  wrapper and has no cross-platform analogue. Note it in a comment as the escape hatch if
  Android feel is ever judged wrong; don't build it speculatively.

## 2. No shared pressable wrapper — keep the `handlePress` pattern

Do **not** introduce a `<HapticPressable>`. The existing convention is a local
`function handlePress() { haptics.select(); onPress(); }` inside the component, and it should stay:

- The bare Pressables are **not homogeneous** — in `record` they sit inside a camera overlay,
  in `MonthCalendar` the cell guards on `cell.inMonth` _inside_ `onPress`, and in
  `LogoutDialog` an inner `onPress={() => {}}` exists purely to block scrim taps and must get
  **no** haptic. A generic wrapper either needs a per-instance prop (same diff size, plus an
  import) or fires in the wrong places.
- It would compete with the pattern `Button`/`Chip`/`RadioOption`/`ToggleRow`/`PlanRow`
  already established at the semantic component boundary.
- Most remaining sites are one line anyway.

Instead, the leverage comes from **five row primitives** that cascade to many screens for free
(P0 below).

---

## 3. Rollout & status tracker

Status: `— pending` → `✓ live`. Flip a cell as each ships.

**All cells below are shipped.** Two corrections found during implementation, noted inline:
the record screen has no camera-flip control (`facing` is hardcoded `front`), and review's
"Save video to gallery" is a dead affordance left deliberately silent.

### P0 — Primitives (do first; cascades to most screens)

| Surface                                | File                                                                                     | Haptic               | Status |
| -------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------- | ------ |
| Wrapper: add success/warning/error     | [src/lib/haptics.ts](src/lib/haptics.ts)                                                 | —                    | ✓ live |
| Wrapper: `setEnabled` gate in `fire()` | [src/lib/haptics.ts](src/lib/haptics.ts)                                                 | —                    | ✓ live |
| Preference store (device-local)        | `src/lib/haptics-preference.ts` (new)                                                    | —                    | ✓ live |
| Hydrate at startup                     | [app/\_layout.tsx](app/_layout.tsx)                                                      | —                    | ✓ live |
| **Settings toggle (§7)**               | [app/(tabs)/settings/index.tsx](<app/(tabs)/settings/index.tsx>)                         | `select()`           | ✓ live |
| Nav rows (covers most of settings)     | [src/components/ui/DetailRows.tsx](src/components/ui/DetailRows.tsx)                     | `select()`           | ✓ live |
| Field card rows                        | [src/components/auth/FieldCard.tsx](src/components/auth/FieldCard.tsx)                   | `select()`           | ✓ live |
| Field group rows                       | [src/components/auth/FieldGroup.tsx](src/components/auth/FieldGroup.tsx)                 | `select()`           | ✓ live |
| Country-code opener                    | [src/components/auth/PhoneEntryRow.tsx](src/components/auth/PhoneEntryRow.tsx)           | `select()`           | ✓ live |
| Country row / close                    | [src/components/auth/CountryPickerModal.tsx](src/components/auth/CountryPickerModal.tsx) | `select()` / `tap()` | ✓ live |
| Scrim + "Stay logged in"               | [src/components/settings/LogoutDialog.tsx](src/components/settings/LogoutDialog.tsx)     | `tap()`              | ✓ live |

`DetailRows`, `FieldCard`, and `FieldGroup` all already gate on an optional `onPress` — add
`handlePress` in that branch only. In `LogoutDialog`, **leave the inner tap-blocker alone**;
the confirm button is a `Button` and is already covered.

### P1 — Moments (highest value; where `notificationAsync` earns its place)

| Surface                                 | File                                                                                   | Haptic                  | Status |
| --------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------- | ------ |
| Record start / manual stop              | [app/record/[date].tsx](app/record/[date].tsx) `handleRecordPress`                     | `heavy()`               | ✓ live |
| 60s auto-stop                           | same, interval branch at `ms >= RECORDING_DURATION_MS`                                 | `heavy()`               | ✓ live |
| Upload failure                          | same, `handleStop` catch (non-simulator)                                               | `error()`               | ✓ live |
| Play / pause                            | [app/review/[recordingId].tsx](app/review/[recordingId].tsx) `togglePlay`              | `tap()`                 | ✓ live |
| Phase advance (audio→video, video→both) | same, `handleCompletePhase`                                                            | `success()`             | ✓ live |
| **Day complete + streak bump**          | same, after `setCompletion(...)` pre-`setPhase('complete')`                            | `success()`             | ✓ live |
| Retake pill                             | same                                                                                   | `tap()`                 | ✓ live |
| OTP verified                            | [app/(auth)/verify-otp.tsx](<app/(auth)/verify-otp.tsx>) `finishVerification`          | `success()`             | ✓ live |
| OTP rejected (3 sites)                  | same, each `setOtpError(true)`                                                         | `error()`               | ✓ live |
| Resend / "Wrong number?"                | same                                                                                   | `tap()`                 | ✓ live |
| Trial started / failed                  | [app/(paywall)/trial-sheet.tsx](<app/(paywall)/trial-sheet.tsx>) `handleStartTrial`    | `success()` / `error()` | ✓ live |
| Phone-change failure                    | [app/(tabs)/settings/change-phone.tsx](<app/(tabs)/settings/change-phone.tsx>)         | `error()`               | ✓ live |
| "Coming soon" refusal                   | [src/components/auth/SocialAuthButtons.tsx](src/components/auth/SocialAuthButtons.tsx) | `warning()`             | ✓ live |

Critical placement details:

- **Auto-stop must fire in the interval branch, not inside `handleStop`.** The interval calls
  `handleStop()` directly, so putting the haptic in `handleStop` would double-fire on the
  manual path (verified in [app/record/[date].tsx](app/record/[date].tsx)).
- **Simulator-limitation Alert gets no haptic** — it's an expected dev condition, not a user failure.
- **Phase advance:** the `Button` already fires `heavy()` on press; `success()` lands after the
  state advances. The gap between them is what makes them read as two events, not one buzz.
- **OTP:** put haptics in `finishVerification` / the `setOtpError` sites, never in the effect
  that auto-submits at 6 digits — the existing `submittedCodeRef` guard already prevents re-entry.
- **"Save video to gallery"** in `review` has no `onPress` at all — a dead affordance. Don't
  haptic a no-op; flag it separately.

### P2 — Long tail (mechanical, batch by file)

| Surface                                                                | File                                                                                                                | Haptic                                         | Status |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------ |
| Speed / size segments, back, edit, regenerate (no flip control exists) | [app/record/[date].tsx](app/record/[date].tsx)                                                                      | `select()` / `tap()` / `heavy()`               | ✓ live |
| Zoom −/+ (rail-guarded)                                                | same                                                                                                                | `select()`                                     | ✓ live |
| Cancel / Save / Clear / chips / regenerate                             | [src/components/recording/EditScriptModal.tsx](src/components/recording/EditScriptModal.tsx)                        | `tap()` / `heavy()` + `success()` / `select()` | ✓ live |
| 7 nav + segment Pressables                                             | [app/(tabs)/settings/index.tsx](<app/(tabs)/settings/index.tsx>)                                                    | `select()` / `tap()`                           | ✓ live |
| Prev/next month, day cell                                              | [src/components/calendar/MonthCalendar.tsx](src/components/calendar/MonthCalendar.tsx)                              | `select()`                                     | ✓ live |
| Segment pills, own-row press                                           | [app/(tabs)/leaderboard/index.tsx](<app/(tabs)/leaderboard/index.tsx>)                                              | `select()`                                     | ✓ live |
| Streak pill                                                            | [app/(tabs)/home/index.tsx](<app/(tabs)/home/index.tsx>)                                                            | `select()`                                     | ✓ live |
| Close                                                                  | [app/playback/[recordingId].tsx](app/playback/[recordingId].tsx)                                                    | `tap()`                                        | ✓ live |
| Time slots, weekday toggles                                            | [app/(tabs)/settings/reminders.tsx](<app/(tabs)/settings/reminders.tsx>)                                            | `select()`                                     | ✓ live |
| `cycleTime`, login link                                                | [app/(onboarding)/reminders.tsx](<app/(onboarding)/reminders.tsx>), [welcome.tsx](<app/(onboarding)/welcome.tsx>)   | `select()` / `tap()`                           | ✓ live |
| Fine-print links, provider rows                                        | `app/(auth)/login.tsx`, `login-email.tsx`, `finish-account.tsx`, `add-phone.tsx`, `app/(tabs)/settings/profile.tsx` | `tap()`                                        | ✓ live |

**Deliberately skipped:** [src/components/auth/OtpBoxes.tsx](src/components/auth/OtpBoxes.tsx)
(the row Pressable only focuses a hidden input — the keyboard's own key clicks already give
feedback, and it would fire on every stray tap) and `EditScriptModal`'s `inputArea` Pressable
(same reason — "tap the paper to type" is noise).

---

## 4. iOS camera suppression & spam guards

**Camera-active suppression.** On iOS the Taptic Engine is disabled while an
`AVCaptureSession` runs — OS policy, per the
[SDK 57 haptics docs](https://docs.expo.dev/versions/v57.0.0/sdk/haptics/). So haptics on
the record screen **may silently do nothing on device** while the preview is live, including
the record start/stop impact.

Decision: **wire it anyway and document it.** The calls are harmless no-ops when suppressed —
exactly the case the wrapper's rejection-swallowing was designed for — and they still fire on
Android and wherever the engine is available. Do **not** build a `Vibration.vibrate()`
fallback: it feels nothing like a Taptic pulse, needs the Android `VIBRATE` permission, and
would make the record screen the one place that buzzes. Add a short comment at the handler so
a future reader doesn't "fix" a working call site. Note the upload-failure `error()` fires
_after_ the session stops, so that one should genuinely land.

**Spam guards:**

1. **Zoom steppers fire only on real change.** The record screen uses `Math.max(0, z - 0.1)` /
   `Math.min(1, z + 0.1)`, so at the rails the value is unchanged but the press still
   registers. Compute `next`, compare, fire only when it differs — mirroring the guard that
   already exists in `nudgeZoom` in
   [app/(tabs)/settings/teleprompter.tsx](<app/(tabs)/settings/teleprompter.tsx>)
   (`if (next === zoom) return;`).
2. **Segmented controls fire only on change.** Speed/size, leaderboard, and settings speed
   pills currently re-fire when tapping the already-active option. Guard before the haptic.
3. **Calendar: taps only.** Day cell haptic goes _inside_ the `cell.inMonth &&` guard so
   greyed cells stay silent. Add no scroll tick.
4. **Never haptic in a re-runnable `useEffect` body** — see the OTP note above.
5. **One haptic per gesture, except press-then-outcome.** Impact on touch + notification on
   resolution is intended; two impacts on one touch is a bug.

---

## 5. Verification

No tests, no linter, no CI — `npx tsc --noEmit` plus a manual device pass is the whole story.
Run `npx tsc --noEmit` clean after **each phase**.

Build with `npx expo run:ios`. **A physical device is mandatory** — the simulator has no
Taptic Engine and Expo Go can't exercise the camera path.

**Device prep (or you'll chase phantoms):** System Haptics **ON** (Settings → Sounds & Haptics),
Low Power Mode **OFF**, iPhone 7 or newer.

**Pass 1 — Regression (P0 didn't break what worked):** each tab gives one tick; a `Button`
gives one medium impact and a **disabled** one gives none; chips/radios/toggles tick once
(dragging a Switch thumb ticks once, not per-pixel).

**Pass 2 — Moments (test hardest):**

- Record start, and a take run to 60s auto-stop — same feedback both ways. Absence with the
  camera live is **expected**, not a bug; record the observed result either way.
- Airplane-mode mid-upload → error notification lands _with_ the Alert; confirm it's the
  three-pulse error pattern, not a single thud.
- Review phase 1 → press impact, a beat, then success. Two distinguishable events. Repeat phase 2.
- Phase 3 → success arrives **with** the confetti/check, after the RPC resolves.
- OTP: 6 correct digits via auto-submit → exactly **one** success. 6 wrong → one error,
  counter decrements, boxes red; retyping doesn't re-fire per keystroke.
- Paywall Start trial → impact then success; airplane mode → error.
- Social auth on login (no `onSelect`) → warning + "Coming soon"; on signup → light tap only.

**Pass 3 — Spam guards:** zoom `+` to 100% then keep pressing → ticks stop at the rail (same
for `−` at 0%, and in settings/teleprompter); tapping an already-selected segment → silent;
scrolling the calendar → silent, in-month tap → one tick, greyed day → silent; another user's
leaderboard row → silent; logout dialog card body → silent, scrim → one tap + dismiss.

**Pass 4 — Platform guards:**

- `npm run web`: click through home → record → settings. Zero console errors, no
  unhandled-rejection warnings — the `Platform.OS === 'web'` short-circuit means nothing
  reaches expo-haptics at all.
- Android device: re-run Pass 2. Confirm nothing crashes and vibrations aren't unpleasantly
  long. If they are, _that_ is the trigger to revisit `performAndroidHapticsAsync` — not before.
- Re-run one Pass 2 item with **System Haptics OFF** → app behaves identically minus the feel,
  no errors, no dropped actions. This is the direct test of the wrapper's "never throws" property.

---

## 6. Settings toggle — "Haptics"

Broadening haptics app-wide needs an off switch. Three decisions, all deliberate:

**Stored device-local, not on `profiles`.** Every other setting is a `profiles` column, so
this is a conscious departure: haptics describe _this handset's_ hardware, the toggle must
respond instantly with no network round-trip, and it must work before/without a session.

Two consequences to accept and document rather than treat as bugs later:

- The preference **does not follow the user to a new device** — a fresh install starts at the
  `true` default. That is the intended trade for instant, offline, per-device behaviour.
- The reminders card will then hold two Supabase-synced toggles (Notification, AI call) next
  to one device-local one, which look identical but persist differently. Note it in a comment
  at the call site so the asymmetry isn't "fixed" by someone later.
- **No migration is required.** There is no `0007_*.sql`; the `profiles` schema is untouched.

**New file: `src/lib/haptics-preference.ts`** — kept separate from `haptics.ts` so the wrapper
stays dependency-free (no storage import, no async) and remains trivially callable anywhere:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as haptics from '@/src/lib/haptics';

const KEY = 'scripai.haptics_enabled';

/**
 * Device-local, not a `profiles` column: haptics describe this handset's hardware,
 * the toggle must respond with no network round-trip, and it must work before a
 * session exists. AsyncStorage rather than SecureStore — this is a preference, not
 * a secret, and it needs to be readable on web where SecureStore is unavailable.
 */
export async function loadHapticsEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw === null ? true : raw === 'true'; // default ON for a fresh install
  } catch {
    return true; // a read failure must not silently disable feedback
  }
}

export async function setHapticsEnabled(next: boolean): Promise<void> {
  haptics.setEnabled(next); // update the live gate first, so the UI responds instantly
  try {
    await AsyncStorage.setItem(KEY, String(next));
  } catch {
    // Preference is decorative; a failed write must never break the toggle.
  }
}
```

`AsyncStorage` is already a dependency (used by the Supabase adapter in
[src/lib/supabase.ts](src/lib/supabase.ts)), so nothing new is installed.

**Hydrate once at startup** in [app/\_layout.tsx](app/_layout.tsx), alongside the existing font
gate — an effect that calls `loadHapticsEnabled()` then `haptics.setEnabled(v)`. It does **not**
need to block rendering: the flag defaults to `true`, so the only risk is one tap in the first
few milliseconds feeling enabled when the user had disabled it. Blocking the splash on a
preference read would be the worse trade.

**UI: a `ToggleRow` in the existing reminders card**, in
[app/(tabs)/settings/index.tsx](<app/(tabs)/settings/index.tsx>), directly under the
"AI call" row. It reuses the component already used by the two rows above it:

```tsx
<ToggleRow
  icon={/* a vibration/waves glyph, 16px, colors.accent[700] — see icons.tsx */}
  label="Haptics"
  subtitle="Vibration feedback on taps"
  value={hapticsOn}
  onValueChange={handleHapticsToggle}
/>
```

Local state (`useState` seeded from `loadHapticsEnabled()`) rather than `profile?.…`, since
there is no column backing it.

**Confirming tick on the toggle itself.** `ToggleRow` already fires `haptics.select()`
internally — which produces exactly the right behaviour for free, and is worth understanding
rather than "fixing":

- Switching **off**: `ToggleRow`'s `select()` runs _before_ `setEnabled(false)` lands, so the
  user feels one last tick — a confirmation of the thing they just silenced.
- Switching **on**: the gate is already `true` by the time feedback fires, so it ticks to
  confirm haptics work.

So `handleHapticsToggle` needs no haptic of its own; it just persists. Verify the ordering on
device — if the off-tick is ever dropped, fire an explicit `haptics.tap()` **before**
`setHapticsEnabled(false)`.

**A new icon is required** (verified — there is no suitable glyph today).
[src/components/ui/icons.tsx](src/components/ui/icons.tsx) exports `FlameIcon`, `BellIcon`,
`PhoneCallIcon`, `CameraIcon`, and 11 others, but nothing vibration-, waves-, or pulse-shaped.
Add a `VibrateIcon` in the same style as its neighbours — an `react-native-svg` component
taking `size` / `color` / `strokeWidth` props, matching `BellIcon`'s signature so it drops
straight into the `ToggleRow` `icon` slot.

**Verification for this section** (add to Pass 1):

- Toggle off → every surface from Pass 2/3 is silent; the app otherwise behaves identically.
- Toggle on → feedback returns immediately, with no app restart.
- Force-quit and relaunch with it off → still off (persistence works).
- Toggle off, then log out and back in → still off (it is device-local, not session-scoped).
- Fresh install → defaults to on.
- Web: the row renders and toggles without error, even though haptics never fire there.

---

## 7. Docs to update on completion

- Add this file to the `## Reference docs` list in [CLAUDE.md](CLAUDE.md).
- Add a short haptics note to CLAUDE.md's `## Styling` section (or a sibling section): the
  two-vocabulary rule and the "never call `expo-haptics` directly, always go through
  `src/lib/haptics.ts`" convention — currently undocumented, which is part of why coverage drifted.
- Note in CLAUDE.md's data-access section that `haptics_enabled` is **device-local
  AsyncStorage, deliberately not a `profiles` column** — the one setting that doesn't follow
  the documented "every setting is a profiles column" pattern.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm start              # Expo dev server (all platforms)
npm run ios            # expo run:ios — native build, required for camera work
npm run android        # expo run:android
npm run web            # expo start --web
npx tsc --noEmit       # typecheck (strict); the only automated check in the repo
```

There is no linter, test runner, or CI in this project — `tsc --noEmit` plus a manual pass on device is the verification story. `.npmrc` sets `legacy-peer-deps=true`, so install with plain `npm install`.

Camera recording only works in a native build (`expo run:ios` / `run:android`) or on web; it does not work in Expo Go.

Supabase:

```bash
supabase db push                              # apply supabase/migrations/*.sql
supabase functions deploy generate-script
supabase secrets set OPENROUTER_API_KEY=sk-or-...
```

`.env.local` supplies `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; [src/lib/supabase.ts](src/lib/supabase.ts) throws at import time if either is missing. `OPENROUTER_API_KEY` is a server-side Edge Function secret only and must never reach the client bundle.

## Architecture

ScripAI is a cross-platform (iOS/Android/web) Expo SDK 57 + Expo Router app. The daily loop is: **get an AI script → record ~60s to camera → review it in three phases → mark the day complete and bump the streak.**

### Navigation and gating

[app/_layout.tsx](app/_layout.tsx) is the single place providers are mounted, in this order: `GestureHandlerRootView` → `KeyboardProvider` → `SafeAreaProvider` → `AuthProvider` → `EntitlementsProvider` → `OnboardingDraftProvider`. It also gates rendering on the Archivo font load and hides the splash screen.

[app/index.tsx](app/index.tsx) is the routing brain — a three-way redirect on `useAuth()`: no session → `(onboarding)/welcome`; session but `!profile.onboarding_complete` → `(onboarding)/name`; otherwise → `(tabs)/home`. Route groups are `(onboarding)`, `(auth)`, `(paywall)`, `(tabs)`, plus two `fullScreenModal` routes: `record/[date]` and `review/[recordingId]`.

`(paywall)` is deliberately **not** a modal at the root level — auth `router.replace`s into it, making it a main-flow destination. Only `trial-sheet` is a modal, declared in the group's own layout. See the comment in [app/_layout.tsx](app/_layout.tsx) before changing this.

### Data access pattern

There is no data-fetching library. Screens and hooks call `supabase-js` directly, and state lives in three contexts plus per-screen hooks in [src/hooks/](src/hooks/). Every table is small and keyed one-row-per-user-per-day, which is why a cache layer was judged unjustified — keep new data access in this style rather than introducing React Query.

- **`AuthProvider`** ([src/providers/AuthProvider.tsx](src/providers/AuthProvider.tsx)) — owns `session` + the `profiles` row, subscribes to `onAuthStateChange`, exposes `refreshProfile()`. Call `refreshProfile()` after any write to `profiles`, or the UI keeps stale values.
- **`EntitlementsProvider`** ([src/providers/EntitlementsProvider.tsx](src/providers/EntitlementsProvider.tsx)) — a deliberate stub over `profiles.is_premium`, shaped so the real RevenueCat SDK can replace its internals without touching any consumer screen. Read premium state via `useEntitlements()`, never `profile.is_premium` directly.
- **`OnboardingDraftProvider`** ([src/providers/OnboardingDraftProvider.tsx](src/providers/OnboardingDraftProvider.tsx)) — the onboarding quiz runs _before_ an account exists, so answers are held in memory and flushed to `profiles` in one `commit(userId)` call from the auth screens right after signup. That commit is what sets `onboarding_complete`, which is what un-gates the tabs.

Session persistence uses a custom `SecureStore` adapter that **chunks values across multiple keys** because SecureStore has a ~2048-byte limit and Supabase sessions exceed it; web falls back to `AsyncStorage`. Don't simplify this back to a plain SecureStore adapter.

### Database

Migrations live in [supabase/migrations/](supabase/migrations/). The critical constraint, documented at length in [0001_init.sql](supabase/migrations/0001_init.sql): **`public.profiles` is shared with another app** already in this Supabase project. It has a pre-existing `handle_new_user` signup trigger, RLS policies, and `customer_id` / `price_id` / `has_access` columns that belong to that other app. ScripAI only _adds_ nullable/defaulted columns and leaves the trigger and those columns alone. Display name is the existing `name` column — there is no `full_name`.

Because that trigger can't know about ScripAI's columns, [0002](supabase/migrations/0002_sync_profile_phone.sql) adds a _second_ independent AFTER trigger named to sort alphabetically after `on_auth_user_created` (Postgres fires same-event triggers in name order) that only `UPDATE`s `profiles.phone`.

Tables: `topics` (prompt pool), `daily_scripts` (unique on `user_id, day`), `recordings` (unique on `user_id, day`, holds the three `reviewed_*` booleans), `day_completions` (thin table for fast calendar/streak reads). `leaderboard` is a **view** over `profiles` with a window-function rank, so it can't drift.

RLS scopes every table to `auth.uid()`. `day_completions` has **no client insert policy** — writes go only through the `SECURITY DEFINER` RPC `fn_complete_day(p_user_id, p_day, p_recording_id)`, which atomically upserts the completion, stamps `recordings.completed_at`, and recomputes streak/longest-streak/points (+10/day). Never write streaks or `day_completions` from the client; call the RPC.

### The daily loop

**Script generation** — [supabase/functions/generate-script/index.ts](supabase/functions/generate-script/index.ts) runs on OpenRouter (`openai/gpt-4o-mini`) and is invoked with the **caller's own JWT** forwarded into a `supabase-js` client, so RLS scopes the insert and no service-role key exists anywhere. It's idempotent: an existing script for that day is returned as-is unless a `topic_title` is passed. It excludes already-used `topic_id`s, and falls back to a hardcoded script when `OPENROUTER_API_KEY` is unset so the loop stays testable locally.

Client side, [useTodayScript](src/hooks/useTodayScript.ts) distinguishes `regenerate()` (invokes the function, may bill) from `refresh()` (plain table read, free — safe to run on every screen focus). Its `describeFunctionError` helper exists because `functions.invoke()` only ever reports the generic "non-2xx status code"; the real reason must be read out of `error.context`, which is the raw `Response`.

**Recording** — [app/record/[date].tsx](app/record/[date].tsx) composes a teleprompter over a camera preview. `RECORDING_DURATION_MS` in [src/lib/recording.ts](src/lib/recording.ts) is the single source of truth for the 60s length: both the "Record · M:SS" labels and the teleprompter's scroll pacing derive from it, so the promised countdown always matches the scroll speed. Camera capture is a **Metro platform split**: `CameraCapture.native.tsx` (expo-camera) vs `CameraCapture.web.tsx` (raw `MediaRecorder`), with the extensionless `CameraCapture.tsx` existing purely as a type-resolution shim for `tsc` — it never runs.

Upload writes one file per day to the private `recordings` bucket at `{user_id}/{day}/video.mp4` (see [src/lib/storage-paths.ts](src/lib/storage-paths.ts)), with storage RLS scoping the first path segment to the user's own folder. On native, read bytes with the new `expo-file-system` `File(uri).arrayBuffer()` — the old `readAsStringAsync`/base64 round-trip is _hard_-deprecated in this SDK and throws.

**Review** — [app/review/[recordingId].tsx](app/review/[recordingId].tsx) plays the _same_ clip three times through `expo-video`, as client-side modes rather than separate files: `audio` (video hidden), `video` (muted), `both`. Each phase flips its `reviewed_*` boolean; finishing all three calls `fn_complete_day` and shows the confetti day-complete state.

Day keys are **local-timezone** `YYYY-MM-DD` strings from `dayKey()` in [src/lib/dates.ts](src/lib/dates.ts) — the unit every streak, calendar, and storage-path query is keyed on. Always pass the client's own local day to the Edge Function rather than letting it default to the server clock.

## Styling

`StyleSheet.create` plus the token file [src/theme/theme.ts](src/theme/theme.ts) — an explicit product requirement. Do not add NativeWind, styled-components, or a UI kit.

Tokens were transcribed from the imported Claude Design system in [_design_import/](_design_import/). Two intentional overrides to preserve:

- The mockups override the design system's 0px base radius with **14-24px rounded corners** everywhere. Build to the mockups (`radii` in theme.ts), not the base tokens.
- The Premium tab deliberately breaks the red accent system for a **gold gradient** (`colors.gold`). This is a designed departure, not a bug.

Font is Archivo (400/600/800). Primary buttons are solid `colors.accent.DEFAULT` (`#ec3013`) with a glow shadow — use `shadows.button`.

## Reference docs

- [_design_import/screens-spec.md](_design_import/screens-spec.md) — screen-by-screen spec (exact copy, states, dynamic fields) for all 48 designed screens. This is the source of truth for UI copy; there is no visual diffing, so changes are verified by a manual pass against it.
- [doc/wobbly-churning-snowglobe.md](doc/wobbly-churning-snowglobe.md) — the original build plan: decisions and their rationale. Note it predates the code in places (it says SDK 51 and `expo-av`; the app is on SDK 57 and `expo-video`).
- [doc/home-screen-spec.md](doc/home-screen-spec.md) — home screen detail spec.

## Known stubs

Apple/Google sign-in buttons are rendered per design but **disabled** pending developer credentials. The paywall is a UI-only flow with no real purchase; RevenueCat is not wired. Phone auth uses Supabase's built-in Twilio Verify provider (`[auth.sms.twilio_verify]` in [supabase/config.toml](supabase/config.toml)) with secrets set in the dashboard.

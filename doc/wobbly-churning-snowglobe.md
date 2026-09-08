# ScripAI — Camera Confidence App

## Context

User wants a cross-platform (iOS/Android/web) Expo app: log in daily, get an AI-generated ~1-minute script, record on camera, review the recording three ways (audio-only / video-only / both), and mark the day complete on a streak calendar. A full UI design ("Camera Confidence App.dc.html", 48 screens) was imported from Claude Design via DesignSync and fully transcribed (screen-by-screen copy, layout, states — see "Design reference" below). The user opted into building the **full design scope** (onboarding quiz, phone+OTP via Twilio Verify, RevenueCat-style paywall stub, leaderboard, premium tier, settings) rather than a stripped-down MVP, chose **OpenRouter (gpt-4o-mini class model)** for script generation, and wants **both email/password and phone/OTP (Twilio Verify)** auth. Supabase project is already provisioned (URL + anon key given; secret key placeholder not needed — see Auth decision below).

## Design reference

Full screen-by-screen spec (exact copy, states, dynamic fields) was extracted from the design doc into this plan's supporting knowledge — **first implementation step is to save it as `_design_import/screens-spec.md`** so it persists as the build reference. Key facts already confirmed from the design system CSS:

- Colors: bg `#f3f2f2`, surface `#eae9e9`, text `#201e1d`, accent `#ec3013` (orange-red, ramps 100-900), font **Archivo** (400/600/800).
- Mockups override the design system's 0px base radius with **14-24px rounded corners** everywhere (cards, buttons, inputs) — build to the mockups, not the base tokens.
- Primary button: solid accent bg, white text, ~54-56px height, 14px radius, glow shadow `0 10px 24px rgba(236,48,19,.35)`.
- Premium tab uses a distinct **gold** gradient (`#e2b13c`→`#b8830a`), not the red accent — intentional visual departure, preserve it.
- 10 screen groups: Login, Onboarding (welcome → how-it-works → name → age → gender → fear-triggers → topics → benefits → reminders → 30-day-challenge → outcome-chart), Create-account (phone/Apple/Google), OTP flow, Paywall (commitment ring → trial offer → feature list → trial-terms sheet), Calendar home & camera (home w/ month grid + today card; camera w/ teleprompter, edit-script, generating-skeleton), Review (3 phases + confetti day-complete), Leaderboard (locked/board/your-standing), Premium, Settings (home/profile/change-phone/reminder-on/reminder-off).
- Dynamic fields to model as real state: streak count, lifetime days, best streak, rank, calendar day states (thumb/done/missed/today/future), today's script text, word-count/duration/readability, OTP digits + resend timer, badges (3/7/14/30-day unlocks), reminder time/toggle/repeat-days.

## Decisions

| Decision             | Choice                                                                                                                                                                                                                                | Why                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework            | Expo SDK 51, Expo Router v3 (file-based), TypeScript strict                                                                                                                                                                           | Standard, matches iOS/Android/web requirement in one codebase                                                                                                    |
| Styling              | `StyleSheet.create` + one `src/theme/theme.ts` token file                                                                                                                                                                             | Explicit user requirement — no NativeWind/UI kit                                                                                                                 |
| State                | React Context (`AuthProvider`, `EntitlementsProvider`) + per-screen hooks calling `supabase-js` directly                                                                                                                              | Data shapes are small, single-row-per-day; a cache library is unjustified complexity                                                                             |
| Auth                 | Supabase Auth native, **both** email/password and phone/OTP; phone uses Supabase's built-in **Twilio Verify** SMS provider (`[auth.sms.twilio_verify]` in `supabase/config.toml`, secrets set in dashboard)                           | Twilio Verify is a first-party supported Supabase provider — `signInWithOtp`/`verifyOtp` mint real sessions natively, no custom JWT-minting Edge Function needed |
| AI script gen        | Supabase Edge Function `generate-script` calling OpenRouter (`openai/gpt-4o-mini`), invoked with the user's own JWT (Postgres RLS scopes the insert, no service-role key required)                                                    | Keeps `OPENROUTER_API_KEY` server-side only                                                                                                                      |
| Recording storage    | **One video file per day** in Supabase Storage (private bucket `recordings`, path `{user_id}/{day}/video.mp4`); all three review "phases" are client-side playback modes (muted/hidden/full) of the same `expo-av` `<Video>` instance | Zero transcoding, zero extra Edge Functions, satisfies the 3-way review UX directly                                                                              |
| Paywall              | `EntitlementsProvider` abstraction backed by `profiles.is_premium` today; swappable for real RevenueCat SDK later without touching consumer screens                                                                                   | No RevenueCat keys provided yet                                                                                                                                  |
| Apple/Google sign-in | Buttons rendered per design but **disabled/stubbed** until Apple/Google developer credentials are provided                                                                                                                            | Native OAuth needs external console setup not yet available                                                                                                      |

## Project structure

```
scripai-app/
  app/                        # Expo Router routes
    _layout.tsx                # providers, font loading, splash gate, auth-based redirect
    (onboarding)/welcome, how-it-works, name, age, gender, fear-triggers, topics, benefits, reminders, streak-intro, outcome.tsx
    (auth)/create-account, verify-otp, login, login-email, forgot-password.tsx
    (paywall)/commit, trial-offer, features, trial-sheet.tsx
    (tabs)/_layout.tsx (Home/Leaderboard/Premium/Settings tab bar)
      home/index.tsx
      leaderboard/index.tsx, [drilldown].tsx
      premium/index.tsx
      settings/index.tsx, profile.tsx, change-phone.tsx, reminders.tsx
    record/[date].tsx           # fullscreen modal: teleprompter + camera capture
    review/[recordingId].tsx    # fullscreen modal: 3-phase review + day-complete
  src/
    components/{ui,onboarding,auth,calendar,recording,review,leaderboard,paywall}/
    hooks/ (useAuth, useProfile, useTodayScript, useRecordings, useStreak, useLeaderboard, useEntitlements, useCountdownTimer)
    providers/ (AuthProvider, EntitlementsProvider)
    lib/ (supabase.ts, storage-paths.ts, dates.ts, validation.ts)
    theme/ (theme.ts, fonts.ts)
    types/database.types.ts
  supabase/
    migrations/0001_init.sql   # tables, RLS, storage policies, trigger, RPC
    functions/generate-script/index.ts
    config.toml                 # [auth.sms.twilio_verify] config
  _design_import/screens-spec.md   # saved design reference (from this plan's research)
```

Key packages: `expo-router`, `expo-camera` (native capture, `CameraView.recordAsync({maxDuration:60})`), `expo-av` (cross-platform playback), `expo-file-system`, `@supabase/supabase-js`, `expo-secure-store`/`@react-native-async-storage/async-storage` (session persistence, native vs web), `@expo-google-fonts/archivo`, `react-native-reanimated` (teleprompter auto-scroll, countdown ring). Web camera capture uses a platform-split component: `CameraCapture.native.tsx` (expo-camera) vs `CameraCapture.web.tsx` (raw `MediaRecorder`), resolved automatically by Metro's platform extensions.

## Supabase schema (summary — full SQL in `supabase/migrations/0001_init.sql`)

- `profiles` (1:1 with `auth.users`: name, phone, email, onboarding fields, `is_premium`, `current_streak`, `longest_streak`, `points`) — populated by an `on_auth_user_created` trigger so both auth methods converge identically.
- `topics` (prompt pool), `daily_scripts` (per user+day AI script, unique on `user_id, day`), `recordings` (storage path + 3 review-phase booleans + `completed_at`, unique on `user_id, day`), `day_completions` (thin table for fast calendar/streak lookups, writes only via a `SECURITY DEFINER` RPC `fn_complete_day` that atomically updates streak/points).
- `leaderboard` is a **view** over `profiles` (rank via window function) — never drifts from source data.
- RLS: every table scoped to `auth.uid() = user_id` (or `= id` for profiles); `day_completions` has no client insert policy (RPC-only writes); Storage policies scope `recordings` bucket paths to the owning user's folder.

## Build order

1. Scaffold Expo Router + theme (Archivo font, splash gate) — verify boots on iOS sim, Android emulator, `expo start --web`.
2. Supabase migration + `supabase.ts` client + `AuthProvider`; build email/password signup/login/logout end-to-end first (simpler path to validate session-gating/routing before phone complexity).
3. Enable Twilio Verify as Supabase's phone provider; build create-account/OTP screens against native `signInWithOtp`/`verifyOtp`; build the full onboarding step sequence with resume logic.
4. Core loop: `generate-script` Edge Function, calendar home, camera record screen (teleprompter + native capture, then web fallback), upload flow, 3-phase review + day-complete celebration + `fn_complete_day` RPC.
5. Leaderboard, Settings, Premium upsell, paywall stub (`EntitlementsProvider`).
6. Polish: confetti/ring micro-animations, Apple/Google button wiring (once credentials exist), notification scheduling (`expo-notifications`), timezone/streak edge cases.

Each milestone should run standalone on device before moving to the next, so the large scope stays shippable incrementally.

## Verification

- After milestone 1: app boots and navigates on iOS Simulator, Android emulator, and web with correct fonts/theme.
- After milestone 2/3: create an account both ways (email, phone+OTP with a real Twilio-Verify-enabled test number), confirm `profiles` row is created via trigger, confirm RLS blocks reading another user's profile (test with two accounts).
- After milestone 4: full loop — generate script, record a real ≤60s clip on a physical/simulated camera, upload succeeds, review through all 3 phases, day marks complete, calendar cell updates, streak increments; re-open app same day confirms idempotent script generation (no duplicate `daily_scripts` row).
- After milestone 5: leaderboard view returns correct rank ordering across 2+ seeded test accounts; settings changes persist and reflect elsewhere (e.g. reminder time shown on both Settings and its own screen).
- Manual visual pass against `screens-spec.md` for each implemented screen (copy text, button labels, states) since there's no automated visual diffing available.

# ScripAI — Camera Confidence App: Screen Spec

Source: `Camera Confidence App.dc.html` (688 lines, Claude Design canvas DSL). Default visual tokens: light bg `var(--color-bg)` (#f3f2f2), white cards, accent `#ec3013` (orange-red) with `--color-accent-100/200/300/700/800` tints, Archivo font family, dark mode variant uses `var(--color-neutral-900)` background with white text. Base design tokens specify 0 border-radius, but **every mockup in this file overrides that with rounded corners (14–24px)**. iOS device frame size used throughout: `402px × 874px` (`ios-frame.jsx`, some screens pass `dark="{{ true }}"` for a dark status bar/home indicator).

Common recurring bottom tab bar (Home / Leaderboard / Premium / Settings) appears on: Home (1e), Leaderboard (1na/1nb/1nc), Premium (1qa/1qb), Settings (1ma–1me). White background, top border, 4 icon+label items 56px min-width; active tab label/icon colored `var(--color-accent)` (or gold `#c9930a` specifically on the Premium tab when active).

## Overall flow

Verbatim from `<div class="dv-brief">` (thread #2, "Restyled to the reference: white cards on grey, orange-red accent, glowing primary button, Home / Leaderboard / Premium / Settings tab bar"):

> Flow: onboarding 1aa–1aj + 1am → login & sign up 1ca–1ci → paywall (commit 1ak/1al) 1pa, 1pc–1pd → home. Kept: (phone + OTP primary, Apple/Google secondary), home 1e, leaderboard 1na–1nc, camera 1ga/1gb/1gc, review 1ja/1jb/1jc, day complete 1kb, premium 1qa/1qb, settings 1ma–1mh. Colours and type come from the Modernist tokens (accent #ec3013, Archivo); corners are rounded to match the reference.

(Note: the brief text says "settings 1ma–1mh" but the actual file only contains settings screens through **1me** — 1mf/1mg/1mh do not exist in this file.)

---

## Group: Already have account → Login

### 1aa′ (repeat of 1aa) — "app entry: returning user taps Log in"
Screen label: `Onboarding A`. Dark theme (`dark="{{ true }}"`), full-bleed **accent-colored background** (`var(--color-accent)`), not the default light bg.
- Flame/torch icon (custom SVG) in a white rounded-square badge, centered inside a white rounded card (24px radius) at the bottom of the screen
- Heading: **"Hey, I'm ScripAI."** (32px bold)
- Subhead: **"One minute a day, on camera."**
- Body copy: "We hand you a topic, you hit record, then you watch it back three ways. Thirty days later the camera is just a camera."
- Pagination dots (3, first one active/wide, pill shape)
- Buttons: **"Get started"** (white pill button, accent text) and **"I already have an account"** (text-only link, translucent white)
- This is literally the same markup as 1aa — used here to represent the returning-user entry point before diverting into Login.

### 1ch — "Returning user — recognised device, one-tap continue; otherwise enter number → OTP"
Screen label: `Login returning`. Light bg, progress bar 33% filled (accent) at top.
- Heading: **"Welcome back"**
- Subhead: **"Your 13-day streak is waiting."** (dynamic: streak count)
- Recognised-account card: circular avatar with initial **"S"** (accent bg), name **"Shahid Rahman"** (dynamic), masked phone **"+1 (415) ••• 0132"** (dynamic), chevron
- Primary button: **"Continue as Shahid"** (name is dynamic)
- Secondary link: **"Use a different number"**
- Divider: "or continue with"
- Two social buttons: **Apple** and **Google** (icon + label, white pill buttons)

### 1cb — "Number entered — Send OTP enabled"
Screen label: `Login phone filled`. Progress bar 67%.
- Heading: **"Welcome back"**
- Subhead: **"Enter your number and we'll text you an OTP."**
- Phone input row: country selector **"🇺🇸 +1"** with chevron, phone field labeled "Phone number" showing dynamic entered value **"(415) 555-0132"** with a blinking text-cursor caret
- Fine print: "By continuing, you agree to receive **SMS** messages from ScripAI for phone verification."
- Primary button: **"Send OTP"** (enabled, full accent color, glow shadow)
- Divider "or continue with" → Apple / Google buttons
- Footer legal text: "By continuing you agree to our **Terms** and **Privacy Policy**."

### 1cd — "OTP — six boxes, resend timer, auto-submit on last digit"
Screen label: `Login OTP`. Progress bar 100%.
- Back chevron link ("Back")
- Heading: **"Enter the OTP"**
- Subhead: "We texted a 6-digit OTP to **+1 (415) 555-0132**. **Wrong number?**" (link)
- 6 OTP boxes: **state = "4 8 [caret] _ _ _"** (2 of 6 filled, 3rd box has active caret/focus outline)
- Countdown text: "Resend OTP in **0:42**"
- Primary button: **"Verify OTP"** (disabled/opacity .45 — not enough digits yet)

---

## Group: Onboarding

### 1aa — "Welcome — mascot greeting, single promise"
Same exact markup as 1aa′ above (dark accent bg, flame icon card). **Get started** / **I already have an account**.

### 1ab — "Three numbered steps"
Screen label: `Onboarding B`. Light bg, progress bar 11%.
- Header row: Back chevron, title **"How it works"**, empty right slot
- Flame icon badge, heading: **"How it works"**
- Subhead: "The same small loop, every day this month."
- Numbered vertical timeline (connecting line between steps):
  1. **"Get a topic"** — "A fresh one-minute script, written for you."
  2. **"Record it"** — "Read from the on-screen teleprompter. One take, max a minute."
  3. **"Watch it back, three ways"** — "Audio only. Video only. Then both together."
- Primary button: **"Start my month"**

### 1ac — "Name — greets you by name for the rest of the flow (pre-fills sign-up)"
Screen label: `Onb name`. Progress bar 22%.
- Header: Back / **"What's your name?"**
- Flame icon badge
- Heading: **"What's your full name?"**
- Subhead: "So the scripts can talk to you like a friend."
- Text input showing dynamic value **"Shahid"** with cursor caret
- Primary button: **"Next"**

### 1ad — "Age — one tap, tunes topic difficulty and examples"
Screen label: `Onb age`. Progress bar 33%.
- Header: Back / **"Age"**
- Heading: **"How old are you?"**
- Subhead: "Helps us pick topics and examples that fit."
- Radio-style option list (single-select cards): **18–24**, **25–34** (selected, accent outline + filled radio dot), **35–44**, **45–54**, **55+**
- Primary button: **"Next"**

### 1ae — "Gender — optional, "prefer not to say" always available"
Screen label: `Onb gender`. Progress bar 44%. Header includes a **"Skip"** link (top-right).
- Heading: **"How do you identify?"**
- Subhead: "Optional. Used only to personalise script voice."
- Radio options: **Female**, **Male** (selected), **Other**, **Prefer not to say**
- Primary button: **"Next"**

### 1af — "Where the fear shows up — the reason they downloaded the app"
Screen label: `Onb situations`. Progress bar 56% (header title "Camera fear" per header row, though olabel differs).
- Heading: **"Where does the camera get to you?"**
- Subhead: "Pick what you're practising for."
- Single-select list: **Work video calls** (selected), Social media videos, Job interviews, Presentations & talks, Dating & personal videos, Teaching or courses
- Primary button: **"Next"**

### 1ag — "Topics — pick what the AI should write about (feeds Topic style in Settings)"
Screen label: `Onb topics`. Progress bar 67%. Header has **"Skip"** link.
- Heading: **"What do you want to talk about?"**
- Subhead: "We'll write tomorrow's script from this mix."
- Multi-select pill/chip grid (checkmark icon = selected): **Work & career** ✓, Startup, Money, **Health** ✓, Family, Travel, **Opinions** ✓, Storytelling, Small talk, Teaching (3 of 9 selected — dynamic)
- Primary button: **"Next"**

### 1ah — "Benefits — why one minute a day works"
Screen label: `Onb benefits`. Progress bar 78%.
- Heading: **"What one minute a day does"**
- 3 benefit cards (icon + title + body), each white rounded card:
  1. **"Desensitise the lens"** — "Daily exposure shrinks the fear response. The camera stops being an audience."
  2. **"Hear your real voice"** — "Reviewing audio, video and both separately trains you to notice, not cringe."
  3. **"Proof you're improving"** — "Thirty recordings on a calendar. Watch day 1 next to day 30."
- Primary button: **"Next"**

### 1ai — "Reminders — time, notification vs AI call, live preview"
Screen label: `Onb notifications`. Progress bar 89%.
- Heading: **"When should we nudge you?"**
- Subhead: "One reminder a day. Pick a time you can actually record."
- Live notification-preview mock (stacked card): app icon, **"ScripAI"** · "now", preview text: "Your script is ready. One minute, whenever you're set."
- Settings rows: **"Remind at"** → **"8:00 PM"** pill (dynamic); toggle row **Notification** (ON, accent) vs **AI call** ("A short call walks you to the camera", OFF)
- Primary button: **"Allow notifications"**

### 1aj — "30-day challenge — this month's calendar ticks off day by day"
Screen label: `Onb streak`. Progress bar 100%.
- Heading: **"Ready for the 30-day challenge?"**
- Subhead: "One take a day, every day this month."
- Dynamic component placeholder: `{{ onbCalendar }}` (a month calendar preview, data-driven)
- Info callout (accent-tinted box): "People who reach a 7-day streak are 3× more likely to finish the month. A 3-day streak unlocks the leaderboard."
- Primary button: **"Next"**

### 1am — "What 30 days does — confidence curve, before and after"
Screen label: `Onb outcome`. Progress bar 100%. Icon changes to an upward-trend arrow icon (not the flame).
- Heading: **"If you commit for 30 days"**
- Subhead: "This is what happens."
- Line chart card: label **"Camera confidence"**, stat **"+82%"** (dynamic), SVG line graph rising left→right with 5 data points, x-axis labels: **Today / Day 10 / Day 20 / Day 30**
- 3 checkmark bullet cards: "You will not have camera fear.", "You will have a discipline.", "You have shown a grit showing up for 30 days."
- Primary button: **"Next"**

---

## Group: Onboarding → Create account (phone, Apple / Google)

### 1ca — "After onboarding — create account with phone (primary) or Apple / Google"
Screen label: `Login phone`. Progress bar 20%.
- Heading: **"Continue account setup"**
- Subhead: "Enter your number to creates your account." *(note: literal copy has grammatical typo "to creates")*
- Phone input, empty/placeholder state: **"(555) 000-0000"** with caret, country **"🇺🇸 +1"**
- SMS consent fine print (same as 1cb)
- Primary button: **"Send OTP"** — **disabled** (opacity .45, no number yet)
- Divider + Apple/Google buttons
- Legal footer (Terms/Privacy)

### 1cg — "Apple sign-in — system sheet over the welcome screen"
Screen label: `Login Apple sheet`. Progress bar 40%.
- Background: blurred/dimmed 1ca screen underneath a dark scrim
- Bottom sheet (white, rounded top corners 24px): drag handle, flame icon, title **"Sign in to ScripAI with Apple"**, subtext "ScripAI will receive your name and email."
- Data rows: **Name: Shahid Rahman**, **Email: Hide My Email** (dynamic values from Apple ID)
- Note: "We'll still ask for your phone number so reminders and AI calls can reach you."
- Button: **"Continue with Face ID"** (black pill, native iOS Face-ID sheet styling — this is the only screen simulating a native OS system sheet)

### 1ci — "After Apple/Google — name and email are known; phone still required"
Screen label: `Signup add phone`. Progress bar 60%.
- Badge/chip: **"Signed in with Apple"** (checkmark icon, accent-tinted pill)
- Heading: **"Add your phone number"**
- Subhead: "Reminders and AI calls need it. We'll text an OTP to confirm."
- Read-only info card: **Name: Shahid Rahman**, **Email: shahid@example.com** (dynamic, pre-filled from OAuth)
- Phone input (empty, caret) + SMS consent text
- Primary button: **"Send OTP"** — disabled

### 1cd′ (repeat of 1cd) — "OTP — six boxes, resend timer, auto-submit on last digit"
Screen label: `Login OTP`. Progress bar 80% (differs from 1cd's 100%, reflecting later position in this flow branch). Identical OTP-box UI/state (4, 8, caret, _, _, _; "Resend OTP in 0:42"; Verify OTP disabled). No "Wrong number?" back-chevron row difference — same layout.

### 1cf′ (repeat of 1cf) — "New user — phone verified; name + email (typed or imported from Apple / Gmail)"
Screen label: `Signup name`. Progress bar 100%.
- Badge: **"Number verified"** (checkmark chip)
- Heading: **"Finish your account"**
- Subhead: "Your name shows on the leaderboard. Email is for receipts and recovery."
- Fields (pre-filled, dynamic): **Full name: Shahid Rahman**, **Email: shahid@example.com** (with caret — actively editable)
- Divider: "or import email from" → **Apple** / **Gmail** buttons
- Primary button: **"Done"**

---

## Group: Create account → OTP flow

### 1cb′ (repeat of 1cb) — "Number entered — Send OTP enabled"
Screen label: `Login phone filled`. Progress bar 33%. Identical to 1cb but header copy is "Continue account setup" (create-account variant) rather than "Welcome back" — phone value **"(415) 555-0132"**, Send OTP **enabled** (full accent, glowing).

### 1cc — "Invalid number — inline error, button stays disabled"
Screen label: `Login phone error`. Progress bar 33%.
- Same header ("Continue account setup")
- Phone field shows partial/invalid input: **"(415) 555"** with caret
- Inline error text (accent-700 color, bold): **"That doesn't look like a full number. Check and try again."**
- Primary button: **"Send OTP"** — disabled
- Apple/Google buttons below (no legal footer shown on this variant — content cut off by error state)

### 1cd″ (repeat of 1cd) — "OTP — six boxes, resend timer, auto-submit on last digit"
Same OTP screen pattern (progress bar value continues sequence; identical UI to 1cd/1cd′).

### 1ce — "Wrong code — boxes turn red, shake, resend available"
Screen label: `Login OTP error`. Progress bar 67%.
- Heading: **"Enter the OTP"**, subhead references **+1 (415) 555-0132** (no "Wrong number?" link here)
- All 6 OTP boxes filled and **outlined/colored in accent-red** (error state): **4 8 3 9 2 0**
- Error text: **"That OTP isn't right. 2 attempts left."** (dynamic attempt counter)
- Link: **"Resend OTP"**
- Primary button: **"Verify OTP"** — enabled (full accent, glow) since all digits filled

### 1cf — "New user — phone verified; name + email (typed or imported from Apple / Gmail)"
Screen label: `Signup name`. Progress bar 100%. Identical content to 1cf′ (Number verified badge, Full name/Email pre-filled fields, Apple/Gmail import buttons, **"Done"** button).

---

## Group: Paywall — shown after login, RevenueCat (app-user ID = account ID)

### 1ak — "Commitment — tap and hold the fingerprint to commit"
Screen label: `Onb commit`. Progress bar 20%. Header title **"Commit"** (no back button, empty left slot).
- Heading (dynamic, uses name): **"I, Shahid, commit to show up every day for the next 30 days to complete the talking-to-camera challenge."**
- Large circular fingerprint icon (200×200) inside an accent-colored circle with a progress ring around it (ring currently empty/0%, `stroke-dashoffset:590.6` = not started)
- Caption: "Tap and hold the fingerprint **to commit.**"

### 1al — "Commitment — holding: ring fills, print presses in"
Screen label: `Onb commit hold`. Progress bar 40%. Same layout as 1ak but:
- Progress ring partially filled (`stroke-dashoffset:177`, ~70% filled — dynamic based on hold duration)
- Fingerprint icon scaled down slightly (`scale(.94)`) and enlarged icon size (108 vs 96) with deeper shadow — visual "pressed in" effect
- Caption changes to: **"Keep holding…"**

### 1pa — "Trial offer — 3 days of premium, framed as a gift"
Screen label: `Paywall offer`. Progress bar 60%. Header title **"Free trial"**.
- Flame icon badge
- Heading: **"3 days of premium, on us"**
- Subhead: "Everything unlocked while you record your first three takes."
- Primary button: **"Next"**
- (No skip option — paywall is mandatory in this flow)

### 1pc — "What you get — premium feature list, Try for free (no skip)"
Screen label: `Paywall features`. Progress bar 100%. Header: Back chevron / **"Premium"**.
- Heading: **"What you'll get"**
- Checklist (accent checkmarks):
  - "Your first 3 days are free"
  - "Cancel any time from the app or App Store"
  - "AI scripts written for your topics"
  - "Audio, video and combined review"
  - "Leaderboard, streaks and badges"
  - "Home-screen widget and AI call reminders"
- Primary button: **"Try for free"**

### 1pd — "How the free trial works — timeline sheet, price (RevenueCat offering), Restore purchases / terms / privacy"
Screen label: `Paywall trial sheet`. Full-screen bottom sheet over a dark scrim, close (×) button top-left.
- Heading: **"How your free trial works"**
- Subhead: "Nothing will be charged today"
- 3-step vertical timeline:
  1. **"Today — first take"** — "3 days of full access, completely free"
  2. **"Day 2 — trial reminder"** — "We'll message you before anything is charged"
  3. **"Day 3 — keep going"** — "Continue with full access or cancel any time"
- Plan selector (3 radio cards, RevenueCat offering — **dynamic pricing**):
  - **Yearly** (selected, accent outline) — "12 mo · $69.99" → "$5.83/mo"
  - **Monthly** — "30 days · $9.99" → "$9.99/mo"
  - **Lifetime** — "One payment" → "$119.99"
- Primary button: **"Start 3-day free trial"**
- Fine print: "$69.99/year ($5.83/mo), billed after the trial"
- Footer links: **Restore Purchases**, **Terms**, **Privacy**

---

## Group: Calendar home & camera

### 1e — "Welcome header + streak, today's task card, month grid with thumbnails, tab bar"
Screen label: `Home A`. Light bg, standard scaffold with top white header bar and bottom tab bar.
- Header: **"Welcome Shahid"** (dynamic name) + streak pill: flame icon + **"12"** (dynamic streak count, accent pill, glow shadow)
- Month calendar card: header **"September 2026"** (dynamic month/year) with prev/next chevrons; 7-col day-of-week header (S M T W T F S); day grid driven by `<sc-for list="{{ days }}">` template with per-day states:
  - `isThumb` → filled dark cell showing a small video-camera icon + day number (recorded day with thumbnail)
  - `isDone` → accent-100 tinted cell with day number (completed, no thumbnail shown)
  - `isMissed` → grey cell, strikethrough day number (missed day)
  - `isToday` → accent-filled cell, pulsing animation (`animation:pulse`), current day highlighted
  - `isFuture` → plain grey-text day number (upcoming, default true placeholder state)
- Today's task card (dark `var(--color-neutral-900)` card, contrasts with light page bg): label **"Today · Thu 18 Sep"** (dynamic date), script prompt **"Explain your job to a curious ten-year-old."** (dynamic — AI-generated topic), 3-step progress indicator (topic ✓ done / record / review, connected by lines), button **"Record · 1:00"** (accent, glowing)
- Bottom tab bar: Home (active) / Leaderboard / Premium / Settings

### 1ga — "Ready to record — script over the viewfinder; refresh regenerates the script"
Screen label: `Camera ready`. **Dark theme**, full-bleed camera viewfinder background via `<image-slot id="cam-a">` (grayscale placeholder for live selfie-camera feed), gradient scrim top/bottom for legibility.
- Top-left: recording timer pill **"0:00 / 1:00"** (dynamic, red dot indicator)
- Top-right: teleprompter speed selector (**Slow / Med(selected) / Fast**) and text-size selector (**S / M / L / XL(selected)**) — both segmented pill controls
- Second row: zoom control (− / slider at 60% / + / "60%" label) and **"New script"** button (refresh icon)
- Center: teleprompter script text overlaid on camera feed (translucent white, masked fade top/bottom): *"Imagine a ten-year-old asks what I do all day. I'd say: I help people say things clearly. Sometimes that's a website, sometimes a talk, sometimes just a paragraph. My favourite part is the moment something confusing suddenly makes sense to someone. That's the whole job."* (dynamic — same script as home card)
- Bottom: large record button (84px white ring, accent filled circle inside, glow)
- Caption: "Tap the script to edit it before you start"

### 1gb — "Edit script — tapped the teleprompter text before recording"
Screen label: `Camera edit script`. Same camera background but blurred + dark overlay (modal state).
- Top bar: **"Cancel"** / **"Edit script"** (title) / **"Save"** (accent-colored, enabled)
- Editable script card (white, floating over camera bg): date label **"Today · Thu 18 Sep"**, full editable script text with blinking caret at the end, footer stats: **"52 words · about 0:40 spoken"** (dynamic) and readability tag **"Clear"** (accent)
- Horizontal scrollable topic-regeneration chip row: **"Generate a different topic"** (refresh icon, first/active) then topic chips: Money, Health, Startup, Family, Travel, Work

### 1gc — "Generating — skeleton while the AI writes a new script"
Screen label: `Camera generating`. Same modal-over-camera layout as 1gb, but:
- Save button disabled (greyed, rgba(255,255,255,.4))
- Script body replaced with shimmering skeleton loading bars (6 lines, varying widths, `animation:shimmer`)
- Status row: pulsing dot + **"Writing your script…"** (loading state text) replacing the word-count/readability footer
- "Generate a different topic" chip now shown in accent-filled active state (as the button just tapped)

---

## Group: Review — three phases & day complete

### 1ja — "Phase 1 — audio only; Retry returns to the camera with the same script"
Screen label: `Review 1 Audio`. Light bg.
- Header: **"Review the video"** + **"Retry"** pill button (refresh icon, top-right)
- Subhead: "Listen first, then watch, then both together."
- 3-step phase list card: **"1 · Audio only"** (accent icon, "Now playing" — active), **"2 · Video, muted"** (greyed, pending), **"3 · Audio + video"** (greyed, pending)
- Audio player card: dynamic waveform `{{ wave }}` placeholder, scrubber showing **0:41 / 1:00** (68% progress, dynamic), large accent play/pause button (pause icon shown = currently playing)
- Caption: "Close your eyes and just listen. Pacing, tone, filler words."
- Primary button: **"Complete audio only review"** — disabled (opacity .45, still playing)

### 1jb — "Phase 2 — video, muted"
Screen label: `Review 2 Video`.
- Same header/phase-list pattern; phase 1 now shows checkmark "Done", phase 2 is active ("Now playing", person/confidence icon), phase 3 still pending
- Video player: `<image-slot id="rev-b">` grayscale placeholder frame from the recording, **"Muted"** badge (top-right, speaker-off icon), center play button overlay, scrubber **0:23 / 1:00** (38%, dynamic)
- Caption: "Mute and just watch. Posture, expressions, where your eyes go."
- Primary button: **"Complete video only review"** — disabled

### 1jc — "Phase 3 — audio + video"
Screen label: `Review 3 Both`.
- Phase 1 & 2 both show checkmark "Done"; phase 3 active with play-triangle icon, "Now playing"
- Video player: `<image-slot id="rev-c">`, **"Sound on"** badge (speaker icon), scrubber **0:23 / 1:00**
- Caption: "Now the whole thing. Notice how sound and picture fit together."
- Primary button: **"Complete review"** — disabled (still playing)

### 1kb — "Same dialog with confetti bursting in from both sides"
Screen label: `Complete B`. Background shows a blurred/dimmed Home screen (header "Welcome Shahid", streak "13", blurred calendar grid) with a dark scrim overlay.
- Confetti animation layer: `{{ confetti }}` (dynamic particle burst, z-index above scrim)
- Modal card (centered, floating, large shadow):
  - `{{ checkBadge }}` — dynamic success checkmark badge/animation placeholder
  - Heading: **"Day 18"** (dynamic day number) — "18 Sep 2026 · 13-day streak" (dynamic date + streak)
  - Mini 7-day week strip (Su–Sa, dates 14–20, dynamic): days 14–18 shown completed (accent checkmark circles), day 18 (today) has an extra ring highlight, days 19–20 shown as empty/future grey circles
  - Primary button: **"Done for the day"**
  - Text link: **"Save video to gallery"**

---

## Group: Leaderboard

### 1na — "Locked — unlocks after a 3-day streak; progress shown"
Screen label: `Leaderboard locked`. Header: **"Leaderboard"**.
- Empty-state card: greyed person icon, heading **"Unlocks at a 3-day streak"**, body: "Record and review three days in a row to join the board. You're on day 2." (dynamic)
- Progress segments: 3 bars, 2 filled accent / 1 grey (2 of 3 days) — dynamic
- Caption: **"2 of 3 days · one more to go"** (dynamic)
- Info card: "How ranking works" — "Ranked by **lifetime days logged**, so a missed day never wipes you out. Your current streak shows next to your name."
- Primary button: **"Record today · 1:00"**
- Tab bar: Leaderboard active

### 1nb — "Board — ranked by lifetime days: you highlighted"
Screen label: `Leaderboard board`.
- Filter segmented control: **Everyone** (selected) / Country / This month
- Podium (top 3, dynamic avatars/names/day-counts):
  - #2 **Daniel K.** — 38 days (silver badge)
  - #1 **Priya M.** — 41 days (largest avatar, gold badge)
  - #3 **Aisha T.** — 36 days (bronze badge)
- Ranked list rows #4–#8 (avatar initial, name, streak-flame icon + streak count, lifetime day total):
  - #4 Marco R. — 4-day streak — 31 days
  - #5 **Shahid Rahman "You"** (highlighted row, accent-tinted background) — 13-day streak (dynamic) — 29 days (dynamic)
  - #6 Lena O. — 9-day streak — 27 days
  - #7 Tom B. — 2-day streak — 24 days
  - #8 Yuki S. — 7-day streak — 22 days
- Footer caption: "Ranked by lifetime days logged"

### 1nc — "Your standing — rank, lifetime days, best streak, badge progress"
Screen label: `Leaderboard you`. Header has back-chevron + **"Your standing"** title (this is a drill-down detail screen, not the main tab).
- Dark stat card (`var(--color-neutral-900)`): avatar **"S"**, **"Shahid Rahman"**, **"#5 of 212 · up 2 this week"** (dynamic rank/movement), streak pill **"13"**; 3-stat row: **29** lifetime days / **13** current streak / **16** best streak (all dynamic)
- Progress card: **"Next: top 3"** — "7 days behind Aisha" (dynamic), progress bar 80% filled
- Badges grid (4 columns, dynamic unlock state):
  - **3** "First streak" — unlocked (accent)
  - **7** "One week" — unlocked (accent)
  - **14** "Two weeks" — locked (grey, opacity .45)
  - **30** "Full month" — locked (grey, opacity .45)

---

## Group: Premium

### 1qa — "Premium tab — free user (RevenueCat entitlement inactive): plan card, perks, Try for free; tab hidden once entitled"
Screen label: `Premium tab`. Header: **"Premium"**.
- **Gold/amber gradient card** (`linear-gradient(135deg,#e2b13c,#b8830a)` — distinct from the app's red accent, signals a special/premium visual treatment): flame icon (gold-tinted white badge), **"ScripAI Premium"**, **"Free plan · 3-day trial available"** (dynamic entitlement state), body: "Everything you need to finish the 30-day challenge, unlocked."
- Feature checklist (gold checkmarks): "AI scripts written for your topics", "Audio, video and combined review", "Leaderboard, streaks and badges", "AI call reminders", "Download every recording in full quality"
- Primary button: **"Try for free"** (gold `#c9930a`, not the red accent)
- Fine print: "3 days free, then $69.99/year · Cancel any time"
- Tab bar: Premium tab icon/label colored gold when active (only tab that deviates from the red-accent active-state convention)

### 1qb — "Tapping Try for free opens the free-trial sheet (same as 1pd)"
Screen label: `Premium sheet`. Identical 1qa content underneath, with the same **free-trial bottom sheet as 1pd** presented on top (close button, "How your free trial works" 3-step timeline, Yearly/Monthly/Lifetime plan selector with same RevenueCat pricing, "Start 3-day free trial" button, Restore Purchases/Terms/Privacy footer).

---

## Group: Settings

### 1ma — "Settings home — initial avatar, full name, grouped rows"
Screen label: `Settings A`. Header: **"Settings"**.
- Dark profile card (`var(--color-neutral-900)`): avatar **"S"**, **"Shahid Rahman"**, **"#5 of 212 · up 2 this week"** (dynamic), **"Edit"** pill button (pencil icon); 3-stat row: **29** lifetime days / **13** current streak / **16** best streak
- Badges row (mirrors 1nc): 3 (unlocked), 7 (unlocked), 14 (locked), 30 (locked)
- **"Daily reminder"** section (inline preview, same live state as 1md): Notification toggle **ON**, AI call toggle off, **Time** row → **"8:00 PM"**
- **"Teleprompter defaults"** section: Scroll speed segmented (Slow/**Med**✓/Fast), Text size row → **"Large"** (chevron), Topic style row → **"Work & life"** (chevron)
- **"Recordings & account"** section: **"Save to Photos"** toggle (off), email row **"shahid@example.com"** (chevron, links to Profile 1mb), **"Log out"** (accent-colored text row)

### 1mb — "Profile — name, email, verified phone, linked Apple / Google"
Screen label: `Profile`. Header: back-chevron + **"Profile"**.
- Avatar **"S"** large
- "Your details" section: **Full name: Shahid Rahman**, **Email: shahid@example.com**, **Phone number: +1 (415) 555-0132** — **"Verified"** badge (dynamic verification state)
- "Linked accounts" section: **Apple — "Connected"** (dynamic), **Google — "Connect"** (not yet linked, action button)
- Primary button: **"Save changes"**

### 1mc — "Change phone number — new number, verified by OTP"
Screen label: `Change phone number`. Header: back-chevron + **"Change phone number"**.
- Read-only "Current number" row: **+1 (415) 555-0132** (dynamic)
- New phone input (empty state): country **"🇺🇸 +1"**, placeholder **"(415) 555-0198"**
- Helper text: "We'll text an OTP to the new number. Reminders and AI calls move over once it's verified."
- Primary button: **"Send OTP"**

### 1md — "Daily reminder — toggle on, time picker, repeat days"
Screen label: `Settings Reminder on`. Header: back-chevron + **"Daily reminder"**.
- "Remind me with" section: **Notification** toggle **ON** (accent), **AI call** toggle **OFF** (grey)
- "Time" section: list of time slots (7:00 AM, 8:00 AM, 12:30 PM, 6:00 PM, **8:00 PM ✓** selected/checkmark, 9:30 PM) — dynamic selection
- "Repeat" section: 7 day-circles (S M T W T F S) — **Mon–Fri selected (accent-filled)**, Sat/Sun unselected (white) — dynamic weekday pattern
- Footer text: **"Next reminder: today at 8:00 PM"** (dynamic, computed from settings)

### 1me — "Daily reminder — off state, picker disabled"
Screen label: `Settings Reminder off`. Same layout as 1md but:
- Both **Notification** and **AI call** toggles are **OFF** (both grey)
- Entire "Time" section is disabled/greyed (opacity .4) — same time list (7:00 AM … 9:30 PM, 8:00 PM still shown as the last-selected/checkmarked time but visually disabled)
- No "Repeat" section shown in this state
- Footer callout instead of "Next reminder" text: **"Without a reminder most people miss two or three days a month. Turn it back on any time."** (persuasion copy to re-enable)

---

## Cross-cutting notes for the React Native build

- **Progress bars**: nearly all onboarding/login/signup/paywall screens (not home/camera/review/leaderboard/premium/settings) have a thin 4px rounded progress bar at the very top, percentage varies per step within its flow (used to compute total step count per sub-flow).
- **Dynamic/data-driven content to model as real state**: streak count (12/13 varies by screen — likely stale mock data, should be a single source of truth), lifetime days count, best streak, current date ("Thu 18 Sep" / "September 2026" / "18 Sep 2026"), calendar day states (thumb/done/missed/today/future) via the `days` list, today's script/topic text (AI-generated, shown identically on Home card and Camera screens), word count + spoken-duration estimate + readability tag on script edit, OTP box fill state + resend countdown, phone number (masked/unmasked), name/email (typed vs imported from Apple/Google), leaderboard ranks/avatars/streaks/lifetime-days (`1nb`/`1nc` — same person's data must stay consistent: Shahid = 29 lifetime days, 13 streak, rank #5 of 212, appears identically in 1nc and 1ma), badge unlock thresholds (3/7/14/30 days), RevenueCat entitlement state (free vs trial vs paid — gates the Premium tab visibility per 1qa's label), pricing/plan data from RevenueCat offering (Yearly $69.99/Monthly $9.99/Lifetime $119.99), waveform (`{{ wave }}`) and confetti (`{{ confetti }}`)/check-badge (`{{ checkBadge }}`) animation placeholders, camera recording timer/zoom level, teleprompter scroll-speed/text-size selection, daily reminder time/toggle/repeat-days configuration.
- **Dark vs light screens**: Dark (`dark="{{ true }}"` on IOSDevice, or explicit dark bg) = 1aa/1aa′ (accent-red full bg), 1ga/1gb/1gc (camera, near-black `var(--color-neutral-900)` with live camera feed via `<image-slot>` + grayscale filter class). Everything else uses the light `var(--color-bg)` scaffold.
- **`<image-slot>` placeholders**: `cam-a` (live camera viewfinder, 1ga/1gb/1gc), `rev-b` (muted video review frame, 1jb), `rev-c` (audio+video review frame, 1jc) — these are where real camera/video content plugs in.
- **Premium tab's gold branding** (`#e2b13c`→`#b8830a` gradient, `#c9930a` buttons) is a deliberate departure from the app's red accent system — worth preserving as a distinct "premium" visual language in the RN implementation rather than reusing the primary accent color.

# Home Screen — Design Specification

Target: mockup (img 2). Current: shipped screen (img 1).

Files: [`app/(tabs)/home/index.tsx`](<../app/(tabs)/home/index.tsx>),
[`src/components/calendar/MonthCalendar.tsx`](../src/components/calendar/MonthCalendar.tsx),
[`src/theme/theme.ts`](../src/theme/theme.ts)

---

## 1. Screen skeleton

```
SafeAreaView            bg #ffffff, edges=['top']
├─ Header               bg #ffffff, h≈56, px 24
│  ├─ "Welcome {name}"  Archivo 800, 24px, #201e1d
│  └─ Streak pill       bg #ec3013, h 32, r 999, px 12
└─ Body                 bg #f3f2f2  ← page gray starts here
   └─ ScrollView        px 24, pt 16, gap 16
      ├─ MonthCalendar  bg #fff, r 18, p 16
      └─ TaskCard       bg #2d2b2b, r 24, p 24, shadow cardLg
```

The white header bar is correct as shipped. Everything below is the delta.

---

## 2. Deltas from current build

Ordered by visual weight. Each is a discrete change.

### 2.1 Calendar card — collapse the dead space ⬅ biggest gap

The current card renders a **fixed 6-row / 42-cell grid** and reserves a full row
even when the month doesn't need one. The mockup card ends right after the last
week that contains real days.

- `buildMonthGrid()` (`src/lib/dates.ts:39`) pads with `cells.length < 42`.
- Change to pad only to a 7-cell boundary — drop the `< 42` clause and the
  `if (cells.length >= 42) break`.
- Sept 2026 starts Tue and has 30 days → 2 lead + 30 + 3 trail = **35 cells (5 rows)**.
  Saves one full 38px row plus the empty sixth row visible in img 1.

Card height goes from ~410px to ~330px, which is what lets the task card sit
higher on the screen without scrolling.

### 2.2 Day cells — pill radius, not squares

| Token      | Current                           | Target                               |
| ---------- | --------------------------------- | ------------------------------------ |
| Cell shape | `aspectRatio: 1`, `radii.sm` (14) | height **40**, `borderRadius` **12** |
| Cell width | `100/7 %` (≈52px, so cells touch) | `100/7 %` with **2px** inset gap     |

In img 1 the filled cells (6, 7) read as large rounded squares that nearly touch.
In the mockup they are visibly narrower than their column with clear gutters.
Add `marginVertical: 2` and an inner `View` at `width: 40` centered, or give the
cell `padding: 2` and move the background to a child.

### 2.3 Completed days — pale red fill on every past completed day

The mockup's dominant calendar texture: most past days carry a **pale red wash**
(`accent[100]` `#fff2ef`) with **red numerals** (`accent.DEFAULT`).

Current `cellDone` already uses `accent[100]` but pairs it with default dark text
(`cellText` → `#201e1d`). Add:

```ts
cellTextDone: {
  color: colors.accent.DEFAULT;
}
```

This is why img 1 looks monochrome and the mockup looks red-forward.

### 2.4 Recording days — dark tile with camcorder glyph

- Fill `neutral[900]` `#2d2b2b`, radius 12 — matches current `cellThumb`. ✓
- Glyph: mockup uses a **video-camera** (Lucide `Video`), current uses `CameraIcon`
  (still camera). Swap to `Video` from `lucide-react-native`, `size 13`, white.
- Layout: glyph **above** the numeral, `gap: 1`, numeral `10px` white. ✓ (current
  `cellTextOnDark` already does this)

### 2.5 Today — solid red, no ring

Mockup day 18: solid `accent.DEFAULT` `#ec3013`, white extrabold numeral, radius 12.
Current `cellToday` matches except the numeral uses `semibold` — bump to
`extrabold` and drop the outer glow/ring seen in img 1's day 7.

Note img 1 shows **day 7 as both today and a recording day**, rendering red with a
camera glyph. Precedence in the mockup is: `today` > `hasRecording` > `completed`.
Current JSX applies `cellToday` after `cellThumb` so the background is already
correct, but the glyph still draws. Gate it: `state?.hasRecording && !cell.isToday`.

### 2.6 Missed days — strikethrough, no fill

Mockup days 6 and 11: **gray** numeral with a line through it, on a _neutral gray_
fill (`neutral[200]`-ish), distinct from the pale-red completed days.
Current `cellTextMissed` has the strikethrough ✓ but no background. Add a
`cellMissed` background at `#eae7e7`.

### 2.7 Month header — circular chevron buttons, left-aligned title

| Element  | Current                           | Target                                                                      |
| -------- | --------------------------------- | --------------------------------------------------------------------------- |
| Title    | centered, 15px semibold           | **left-aligned**, 17px, `extrabold`                                         |
| Chevrons | bare 16px glyphs, `space-between` | **32×32 circles**, `neutral[100]` bg, r 999, paired on the **right**, gap 8 |

Structural change: header becomes
`[title] ——flex spacer—— [‹][›]` rather than `[‹] [title] [›]`.

Also replace the `rotate: 180deg` hack on the next-month button with a real
`ChevronRight` — rotating flips the hitbox origin and is why the right chevron's
tap target feels off-center.

### 2.8 Weekday row — lighter

`11px semibold #9b9797` → `12px regular` `neutral[400]` `#bab6b6`.
The mockup's S M T W T F S is noticeably lighter than the day numerals.

---

## 3. Task card

| Property    | Current                                            | Target                                                                     |
| ----------- | -------------------------------------------------- | -------------------------------------------------------------------------- |
| Eyebrow     | `Today · Mon, 7 Sep`, 13px semibold `neutral[400]` | `TODAY · THU 18 SEP` — **uppercase**, 11px, `letterSpacing: 0.8`           |
| Title       | 19px semibold, 1 line ("Health")                   | **20px extrabold**, wraps to 2 lines, `lineHeight: 27`                     |
| Step labels | `Topic` / `Record` / `Review` capitalized          | **lowercase** `topic` / `record` / `review`                                |
| Step dots   | 22px, done=red✓ / pending=gray                     | 24px; pending shows a **lock glyph** (Lucide `Lock`, 11px, `neutral[500]`) |
| Connector   | 2px, red when done                                 | 2px; **never red** — always `neutral[700]` `#605d5d`                       |
| Button      | `Record · 3:00`                                    | `Record · 1:00` — 1-minute default, verify against script duration         |

The step rail in the mockup reads as _locked-until-earned_: only `topic` is
complete, and `record`/`review` show padlocks rather than empty circles. Img 1
shows two red-filled dots and a red connector, which overstates progress.

### Radius / shadow

- Card radius `radii.xl` (24) ✓
- `shadows.cardLg` ✓ — but the mockup's glow is tighter. Consider
  `shadowRadius: 18`, `shadowOffset.height: 8`.

---

## 4. Streak pill

The mockup pill is a **flame + count** (`FlameIcon`, as shipped in code).
Img 1 renders a **sparkle/star** glyph instead — confirm `FlameIcon` in
`src/components/ui/icons` actually draws a flame; the rendered output suggests it
does not.

| Property   | Value                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| Background | `accent.DEFAULT` `#ec3013`                                             |
| Height     | **32** (currently 36)                                                  |
| Radius     | 999                                                                    |
| Padding    | `paddingHorizontal: 12`, `gap: 6`                                      |
| Icon       | flame, 15px, white                                                     |
| Count      | 16px `extrabold` white                                                 |
| Shadow     | `shadows.button` — mockup's is subtler; drop `shadowOpacity` to `0.28` |

---

## 5. Tab bar

Matches the mockup as of the Lucide swap. Two residual notes:

- Icon size 24, `strokeWidth` 2 ✓
- `Premium` gold `#c9930a` ✓ — the one intentional break from the red accent system
- Mockup label size reads ~11px ✓

---

## 6. Token additions

Nothing new required. Two values used above are not yet tokens:

```ts
// theme.ts
radii.cell = 12; // calendar day cell
spacing.xxs = 2; // day-cell gutter
```

---

## 7. Implementation order

1. `buildMonthGrid` 6-row → dynamic rows (§2.1) — unlocks the layout
2. Calendar cell shape + gutters (§2.2)
3. Completed-day red numerals (§2.3) — biggest color-identity win
4. Month header restructure (§2.7)
5. Task card typography + lock glyphs (§3)
6. Missed-day fill, `Video` glyph, today precedence (§2.4–2.6)
7. Streak pill flame verification (§4)

Steps 1–3 account for most of the perceived difference between the two screens.

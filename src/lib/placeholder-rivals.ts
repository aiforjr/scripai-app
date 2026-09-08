/**
 * PLACEHOLDER competitors and hard-coded ranks for the leaderboard.
 *
 * The board needs enough rows to read as a ranked list, but there are no other
 * real users yet. Everything here stands in until there are — delete this file
 * and its imports in the leaderboard screen once the board fills with real
 * accounts and ranks can be derived from the `leaderboard` view.
 *
 * Names are masked (`Sag**`, `Gau***`) so no row reads as a real, identifiable
 * person while still looking like a handle rather than a slot number.
 *
 * Values are fixed, not randomised at runtime — a board that reshuffles on
 * every render can't be reasoned about, and your own rank would jump between
 * renders.
 */

export interface RivalRow {
  /** Stable key; prefixed so it can never collide with a real user's uuid. */
  id: string;
  label: string;
  days: number;
  currentStreak: number;
}

/**
 * Where the signed-in user sits on each tab. Hard-coded for now, per product
 * direction: the month rank puts them mid-list, and the lifetime rank is deep
 * enough to look like a real board of a few hundred people.
 */
export const HARDCODED_RANK = {
  month: 7,
  lifetime: 187,
} as const;

/** The top three on each tab — the podium, always ranks 1-3. */
export const PODIUM: Record<'month' | 'lifetime', readonly RivalRow[]> = {
  month: [
    { id: 'm-pod-1', label: 'Adi***', days: 24, currentStreak: 24 },
    { id: 'm-pod-2', label: 'Gau***', days: 22, currentStreak: 19 },
    { id: 'm-pod-3', label: 'Nis**', days: 21, currentStreak: 21 },
  ],
  lifetime: [
    { id: 'l-pod-1', label: 'Dev***', days: 412, currentStreak: 96 },
    { id: 'l-pod-2', label: 'Kav**', days: 388, currentStreak: 61 },
    { id: 'l-pod-3', label: 'Ish***', days: 364, currentStreak: 44 },
  ],
};

/**
 * The rows immediately above and below the user, in rank order. The user is
 * spliced into the middle of each list by the screen, so each side holds the
 * neighbours for one tab.
 *
 * `month` gives ranks 5-6 above and 8-9 below (user at 7); `lifetime` gives
 * 185-186 above and 188-189 below (user at 187).
 */
export const NEIGHBOURS: Record<
  'month' | 'lifetime',
  { above: readonly RivalRow[]; below: readonly RivalRow[] }
> = {
  month: {
    above: [
      { id: 'm-up-2', label: 'Rah**', days: 16, currentStreak: 11 },
      { id: 'm-up-1', label: 'Pri**', days: 15, currentStreak: 8 },
    ],
    below: [
      { id: 'm-dn-1', label: 'Meh**', days: 12, currentStreak: 5 },
      { id: 'm-dn-2', label: 'Ani**', days: 11, currentStreak: 3 },
    ],
  },
  lifetime: {
    above: [
      { id: 'l-up-2', label: 'Sne***', days: 42, currentStreak: 12 },
      { id: 'l-up-1', label: 'Man**', days: 40, currentStreak: 6 },
    ],
    below: [
      { id: 'l-dn-1', label: 'Kir**', days: 36, currentStreak: 9 },
      { id: 'l-dn-2', label: 'Tan***', days: 34, currentStreak: 2 },
    ],
  },
};

/** Total board size shown as context alongside a deep rank ("#187 of 1,204"). */
export const BOARD_SIZE = {
  month: 312,
  lifetime: 1204,
} as const;

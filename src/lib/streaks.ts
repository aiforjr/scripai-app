/**
 * Single source of truth for the leaderboard's streak gate.
 *
 * The locked-state heading, progress segments, caption and the onboarding
 * streak-intro callout all derive from this, so the promise made during
 * onboarding always matches the gate the leaderboard actually enforces.
 */
export const STREAK_TO_UNLOCK = 12;

/** Cardinal number words for the small counts that appear in body copy. */
const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
] as const;

/**
 * Spells out a count for prose ("Record and review twelve days in a row"),
 * falling back to digits past the range the copy needs.
 */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

/**
 * Single source of truth for the daily recording length.
 *
 * Both the "Record · M:SS" call-to-action labels and the teleprompter's scroll
 * pacing derive from this, so the countdown a user is promised always matches
 * how fast the script actually scrolls.
 */
export const RECORDING_DURATION_MS = 60_000;

/** 'M:SS' — the form used in the Record button labels. */
export function formatDuration(ms: number = RECORDING_DURATION_MS): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

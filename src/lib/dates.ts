/** Local-timezone 'YYYY-MM-DD' day key — the unit every streak/calendar query is keyed on. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, delta: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + delta);
  return dayKey(d);
}

export function formatShort(key: string): string {
  return parseDayKey(key).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatMonthYear(year: number, month0: number): string {
  return new Date(year, month0, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

/** Length of the onboarding challenge, in days — the streak-intro calendar fills exactly this many cells. */
export const CHALLENGE_DAYS = 30;

/**
 * The challenge window as day keys: today plus the next 29 days, so it is always
 * exactly `CHALLENGE_DAYS` long and the screen's "30 days" label is always true.
 *
 * Starting late in a month therefore runs past its end — `challengeMonths` reports
 * the months this spans so the calendar can advance as the run is drawn.
 */
export function buildChallengeWindow(start: Date = new Date()): string[] {
  const first = dayKey(start);
  return Array.from({ length: CHALLENGE_DAYS }, (_, i) => addDays(first, i));
}

/**
 * The distinct months a challenge window touches, in order, as `{ year, month0 }`.
 * A 30-day run always covers two months unless it happens to start on the 1st of a
 * 30-or-31-day month, in which case it covers one.
 */
export function challengeMonths(window: string[]): { year: number; month0: number }[] {
  const months: { year: number; month0: number }[] = [];
  for (const key of window) {
    const date = parseDayKey(key);
    const year = date.getFullYear();
    const month0 = date.getMonth();
    const last = months[months.length - 1];
    if (!last || last.year !== year || last.month0 !== month0) {
      months.push({ year, month0 });
    }
  }
  return months;
}

export interface MonthDay {
  day: number;
  key: string;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/**
 * Builds a Sun-start calendar grid for the given month, including lead/trail days.
 * Rows are only as many as the month actually needs (5 or 6) — no empty trailing
 * week, so the calendar card collapses to fit its content.
 */
export function buildMonthGrid(year: number, month0: number): MonthDay[] {
  const today = dayKey();
  const firstOfMonth = new Date(year, month0, 1);
  const startOffset = firstOfMonth.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month0, 0).getDate();

  const cells: MonthDay[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const date = new Date(year, month0 - 1, d);
    cells.push({ day: d, key: dayKey(date), inMonth: false, isToday: false, isFuture: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month0, d);
    const key = dayKey(date);
    cells.push({ day: d, key, inMonth: true, isToday: key === today, isFuture: key > today });
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const lastDate = parseDayKey(last.key);
    lastDate.setDate(lastDate.getDate() + 1);
    cells.push({
      day: lastDate.getDate(),
      key: dayKey(lastDate),
      inMonth: false,
      isToday: false,
      isFuture: true,
    });
  }

  return cells;
}

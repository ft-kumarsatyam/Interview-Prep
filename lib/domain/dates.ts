/**
 * Calendar-day helpers. A "day" in PrepOS is a local calendar date in the
 * app timezone, represented as a `YYYY-MM-DD` string. Arithmetic is done in
 * UTC on those strings so it never depends on the server's own timezone.
 */

export type DateStr = string;

const DAY_MS = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const formatters = new Map<string, Intl.DateTimeFormat>();

/** The local calendar date of `instant` in `timeZone`, e.g. "2026-10-05". */
export function toLocalDate(instant: Date, timeZone: string): DateStr {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatters.set(timeZone, fmt);
  }
  return fmt.format(instant);
}

export function isDateStr(value: string): value is DateStr {
  if (!DATE_RE.test(value)) return false;
  return new Date(toUtcMs(value)).toISOString().slice(0, 10) === value;
}

function toUtcMs(date: DateStr): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: DateStr, days: number): DateStr {
  return new Date(toUtcMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `b` to `a` (positive when `a` is later). */
export function diffDays(a: DateStr, b: DateStr): number {
  return Math.round((toUtcMs(a) - toUtcMs(b)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(date: DateStr): number {
  return new Date(toUtcMs(date)).getUTCDay();
}

export const isSunday = (date: DateStr) => dayOfWeek(date) === 0;
export const isSaturday = (date: DateStr) => dayOfWeek(date) === 6;

/** 1-based plan week; week 1 starts on `startDate`. */
export function weekNumber(date: DateStr, startDate: DateStr): number {
  return Math.floor(diffDays(date, startDate) / 7) + 1;
}

/** Inclusive list of dates from `from` to `to`. Empty if `to` < `from`. */
export function eachDay(from: DateStr, to: DateStr): DateStr[] {
  const out: DateStr[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** The Saturday that closes the Mon–Sun plan week containing `date`. */
export function saturdayOfWeek(date: DateStr): DateStr {
  const dow = dayOfWeek(date);
  return dow === 0 ? addDays(date, -1) : addDays(date, 6 - dow);
}

/**
 * The instant the next local calendar day starts in `timeZone`, to the second. Found
 * by searching for the moment `toLocalDate` rolls over, so DST and odd offsets are handled.
 */
export function startOfNextLocalDayMs(instant: Date, timeZone: string): number {
  const today = toLocalDate(instant, timeZone);
  let lo = instant.getTime();
  let hi = lo + 26 * 3_600_000;
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2);
    if (toLocalDate(new Date(mid), timeZone) === today) lo = mid;
    else hi = mid;
  }
  return hi;
}

/**
 * Time zone math and display formatting for the cards.
 *
 * Everything goes through Intl with an IANA zone name, so the bundle ships no
 * time zone database. The zone and 12/24 h choice come from Home Assistant.
 */

const MINUTE_MS = 60_000;

export interface FormatContext {
  timeZone: string;
  hour12: boolean;
  language: string;
}

export interface ZonedParts {
  year: number;
  /** 1 to 12 */
  month: number;
  day: number;
  /** Minutes since local midnight */
  minutes: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Intl formatters are slow to build, and the cards format the same few shapes repeatedly */
function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = locale + JSON.stringify(options);
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, f);
  }
  return f;
}

/** Wall-clock date and time of `date` in `timeZone` */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = formatter('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    minutes: get('hour') * 60 + get('minute'),
  };
}

/** Minutes `timeZone` is ahead of UTC at the instant `utcMs` */
function zoneOffsetMinutes(utcMs: number, timeZone: string): number {
  const p = zonedParts(new Date(utcMs), timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day) + p.minutes * MINUTE_MS;
  return Math.round((asUtc - Math.floor(utcMs / MINUTE_MS) * MINUTE_MS) / MINUTE_MS);
}

/**
 * The instant when the clock in `timeZone` reads the given date and time.
 * In a DST gap the time doesn't exist; the result lands just after the gap.
 * In a DST overlap the earlier of the two instants is returned.
 */
export function zonedToUtc(
  year: number,
  month: number,
  day: number,
  minutes: number,
  timeZone: string,
): Date {
  const naive = Date.UTC(year, month - 1, day) + minutes * MINUTE_MS;
  // The offsets in force half a day either side cover any DST change near this time
  const offsets = [
    zoneOffsetMinutes(naive - 14 * 60 * MINUTE_MS, timeZone),
    zoneOffsetMinutes(naive + 14 * 60 * MINUTE_MS, timeZone),
  ];
  const valid = offsets
    .map((o) => naive - o * MINUTE_MS)
    .filter((t, i) => zoneOffsetMinutes(t, timeZone) === offsets[i]);
  if (valid.length) return new Date(Math.min(...valid));
  // In a gap: shift forward by the size of the gap
  return new Date(naive - Math.min(...offsets) * MINUTE_MS);
}

/** Local noon of the calendar day containing `date`: a stable anchor for daily sun math */
export function localNoon(date: Date, timeZone: string): Date {
  const p = zonedParts(date, timeZone);
  return zonedToUtc(p.year, p.month, p.day, 12 * 60, timeZone);
}

export function formatTime(date: Date, ctx: FormatContext): string {
  return formatter(ctx.language, {
    timeZone: ctx.timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: ctx.hour12,
  }).format(date);
}

/** Clock time for a minutes-since-midnight value, independent of any date */
export function formatMinutes(minutes: number, ctx: FormatContext): string {
  return formatTime(new Date(Date.UTC(2000, 0, 1) + minutes * MINUTE_MS), { ...ctx, timeZone: 'UTC' });
}

/** Short month and day, such as "Jun 21" */
export function formatDayMonth(date: Date, ctx: FormatContext): string {
  return formatter(ctx.language, { timeZone: ctx.timeZone, month: 'short', day: 'numeric' }).format(date);
}

export function formatNumber(value: number, ctx: FormatContext, digits: number): string {
  return new Intl.NumberFormat(ctx.language, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Hours as "14h 05m" */
export function formatDuration(hours: number): string {
  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, '0')}m`;
}

/** A signed change in seconds as "+2m 13s" or "−0m 48s" */
export function formatChange(seconds: number): string {
  const total = Math.round(Math.abs(seconds));
  const sign = seconds < 0 ? '−' : '+';
  return `${sign}${Math.floor(total / 60)}m ${String(total % 60).padStart(2, '0')}s`;
}

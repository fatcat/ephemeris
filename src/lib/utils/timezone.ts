/**
 * Timezone utilities — lat/lon → IANA timezone → DST-aware offset/abbreviation.
 *
 * Uses @photostructure/tz-lookup (CC0, ~86KB) for the geographic lookup,
 * then the browser's Intl API for offset and abbreviation (handles DST).
 */

import tzlookup from '@photostructure/tz-lookup';

/**
 * Look up the IANA timezone name for a given latitude/longitude.
 * Returns e.g. "America/New_York", "Asia/Kolkata", "Europe/London".
 * Falls back to "Etc/UTC" on error.
 */
export function lookupTimezone(lat: number, lon: number): string {
  try {
    return tzlookup(lat, lon);
  } catch {
    return 'Etc/UTC';
  }
}

/**
 * Get the UTC offset in milliseconds for a given date and IANA timezone.
 * Correctly handles DST transitions.
 *
 * Positive = east of UTC, negative = west.
 */
export function getUtcOffsetMs(date: Date, timeZone: string): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone });
  return new Date(tzStr).getTime() - new Date(utcStr).getTime();
}

/**
 * Get the timezone abbreviation (e.g. "EST", "EDT", "GMT+5:30") for a
 * given date and IANA timezone.
 */
export function getTimezoneAbbr(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'short',
  }).formatToParts(date);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? 'UTC';
}

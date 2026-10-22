/**
 * The few things the cards read from Home Assistant's `hass` object.
 *
 * Field names follow the HA frontend (`src/types.ts`, `src/data/translation.ts`)
 * and home-assistant-js-websocket's `HassConfig`, checked 2026-10-20.
 */

import type { FormatContext } from './format.js';

/** One entity's state, as far as the cards read it */
export interface HassEntityLike {
  state?: unknown;
  attributes?: Record<string, unknown>;
}

/** The subset of `hass` the cards use. Everything is optional because it comes from outside. */
export interface HassLike {
  config?: { latitude?: unknown; longitude?: unknown; time_zone?: unknown };
  locale?: { language?: unknown; time_format?: unknown; time_zone?: unknown };
  themes?: { darkMode?: unknown };
  states?: Record<string, HassEntityLike | undefined>;
}

export interface HomeContext extends FormatContext {
  lat: number;
  lon: number;
  dark: boolean;
}

/** The browser's own zone, or undefined when Intl can't name one */
export function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

function isTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function isLanguage(tag: unknown): tag is string {
  if (typeof tag !== 'string' || !tag) return false;
  try {
    return Intl.getCanonicalLocales(tag).length > 0;
  } catch {
    return false;
  }
}

/**
 * 12 or 24 hour clock, matching HA's own `useAmPm`: "language" and "system"
 * ask Intl how 22:00 is written in that language (or the browser's).
 */
export function resolveHour12(timeFormat: unknown, language: string): boolean {
  if (timeFormat === '12') return true;
  if (timeFormat === '24') return false;
  const test = new Date(2023, 0, 1, 22).toLocaleString(timeFormat === 'system' ? undefined : language);
  return test.includes('10');
}

/**
 * Home location, time zone and display preferences, or null when `hass` doesn't
 * carry a usable home location yet.
 *
 * The time zone follows the user's profile setting: "local" means the browser's
 * zone, anything else the server's, the same rule HA applies to its own cards.
 */
export function homeFromHass(hass: HassLike, localZone = browserTimeZone()): HomeContext | null {
  const lat = hass.config?.latitude;
  const lon = hass.config?.longitude;
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (typeof lon !== 'number' || !Number.isFinite(lon) || lon < -180 || lon > 180) return null;

  const serverZone = isTimeZone(hass.config?.time_zone) ? hass.config.time_zone : 'UTC';
  const timeZone =
    hass.locale?.time_zone === 'local' && isTimeZone(localZone) ? localZone : serverZone;

  const language = isLanguage(hass.locale?.language) ? hass.locale.language : 'en';

  return {
    lat,
    lon,
    timeZone,
    language,
    hour12: resolveHour12(hass.locale?.time_format, language),
    dark: hass.themes?.darkMode === true,
  };
}

export function sameHome(a: HomeContext | null, b: HomeContext | null): boolean {
  if (!a || !b) return a === b;
  return (
    a.lat === b.lat &&
    a.lon === b.lon &&
    a.timeZone === b.timeZone &&
    a.language === b.language &&
    a.hour12 === b.hour12 &&
    a.dark === b.dark
  );
}

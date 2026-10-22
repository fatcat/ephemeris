/**
 * Info boxes: the small label/value tiles under each card's chart.
 *
 * Each id maps to a label and a pure function of the moment shown and the home
 * location. Cards add their own ids (such as panel alignment) on top of these.
 */

import {
  computeSunData,
  findEquinoxOrSolstice,
  sunElevationAzimuth,
  sunriseSunset,
  sunTimesForAltitude,
} from '../lib/astronomy/solar.js';
import {
  formatChange,
  formatDayMonth,
  formatDuration,
  formatNumber,
  formatTime,
  localNoon,
  zonedParts,
} from './format.js';
import type { HomeContext } from './home.js';

const DAY_MS = 86_400_000;
const NONE = '—';

export const MAX_INFO = 6;

export interface InfoInput {
  /** The moment the card is showing */
  instant: Date;
  home: HomeContext;
  /** The card's own parsed options, for card-specific boxes */
  card: unknown;
}

/** One line of a multi-row box, such as a solar panel and its share of sunlight */
export interface InfoRow {
  name: string;
  percent: number;
}

/** Plain text, or rows with a small bar each */
export type InfoValue = string | { rows: InfoRow[] };

export interface InfoDef {
  label: string;
  value: (input: InfoInput) => InfoValue;
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function degrees(value: number, input: InfoInput, digits = 1): string {
  return `${formatNumber(value, input.home, digits)}°`;
}

/** Sun times on the local calendar day of the instant, crossing `altitude` */
function dayTimes(input: InfoInput, altitude?: number) {
  const { home } = input;
  const day = localNoon(input.instant, home.timeZone);
  return altitude === undefined
    ? sunriseSunset(day, home.lat, home.lon)
    : sunTimesForAltitude(day, home.lat, home.lon, altitude);
}

/** A crossing time, or what to say when the sun never gets there */
function crossing(time: Date | null, dayLength: number, input: InfoInput, always: string, never: string): string {
  if (time) return formatTime(time, input.home);
  return dayLength >= 24 ? always : never;
}

export const SHARED_INFO = {
  status: {
    label: 'Sun',
    value: (i) => computeSunData(i.instant, i.home.lat, i.home.lon).status,
  },
  elevation: {
    label: 'Elevation',
    value: (i) => degrees(sunElevationAzimuth(i.instant, i.home.lat, i.home.lon).elevation, i),
  },
  azimuth: {
    label: 'Azimuth',
    value: (i) => {
      const { azimuth } = sunElevationAzimuth(i.instant, i.home.lat, i.home.lon);
      return `${degrees(azimuth, i, 0)} ${COMPASS[Math.round(azimuth / 45) % 8]}`;
    },
  },
  sunrise: {
    label: 'Sunrise',
    value: (i) => {
      const t = dayTimes(i);
      return crossing(t.sunrise, t.dayLength, i, 'Up all day', 'No sunrise');
    },
  },
  sunset: {
    label: 'Sunset',
    value: (i) => {
      const t = dayTimes(i);
      return crossing(t.sunset, t.dayLength, i, 'Up all day', 'No sunset');
    },
  },
  daylight: {
    label: 'Daylight',
    value: (i) => formatDuration(dayTimes(i).dayLength),
  },
  solar_noon: {
    label: 'Solar noon',
    value: (i) => formatTime(dayTimes(i).solarNoon, i.home),
  },
  noon_height: {
    label: 'Noon height',
    value: (i) => {
      const noon = dayTimes(i).solarNoon;
      const { elevation } = sunElevationAzimuth(noon, i.home.lat, i.home.lon);
      return elevation > 0 ? degrees(elevation, i) : 'Below horizon';
    },
  },
  daylight_change: {
    label: 'vs. yesterday',
    value: (i) => {
      const today = dayTimes(i).dayLength;
      const yesterday = dayTimes({ ...i, instant: new Date(i.instant.getTime() - DAY_MS) }).dayLength;
      const seconds = (today - yesterday) * 3600;
      return Math.abs(seconds) < 0.5 ? 'No change' : formatChange(seconds);
    },
  },
  next_solstice: {
    label: 'Next solstice',
    value: (i) => formatDayMonth(nextSolstice(i.instant, i.home.timeZone), i.home),
  },
  civil_dawn: {
    label: 'Civil dawn',
    value: (i) => {
      const t = dayTimes(i, -6);
      return crossing(t.sunrise, t.dayLength, i, 'No dark', NONE);
    },
  },
  civil_dusk: {
    label: 'Civil dusk',
    value: (i) => {
      const t = dayTimes(i, -6);
      return crossing(t.sunset, t.dayLength, i, 'No dark', NONE);
    },
  },
  golden_hour: {
    label: 'Golden hour',
    // Evening golden hour starts when the sun drops below 6°
    value: (i) => {
      const t = dayTimes(i, 6);
      return crossing(t.sunset, t.dayLength, i, 'Sun stays high', NONE);
    },
  },
} satisfies Record<string, InfoDef>;

export type SharedInfoId = keyof typeof SHARED_INFO;

/** The first June or December solstice after `instant` */
export function nextSolstice(instant: Date, timeZone: string): Date {
  const { year } = zonedParts(instant, timeZone);
  for (const y of [year, year + 1]) {
    for (const lon of [90, 270]) {
      const date = findEquinoxOrSolstice(y, lon);
      if (date.getTime() > instant.getTime()) return date;
    }
  }
  // Unreachable: a solstice always falls within the next year
  return findEquinoxOrSolstice(year + 1, 90);
}

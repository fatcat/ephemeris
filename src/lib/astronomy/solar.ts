/**
 * Jean Meeus medium-precision solar position algorithm.
 * Based on "Astronomical Algorithms" (2nd ed.).
 *
 * Accuracy: < 0.01° within ±100 years of J2000.0
 * Time range: clamped to ±200 years from J2000.0
 */

import { Vector3 } from 'three';
import type { SolarPosition } from './types.js';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// J2000.0 epoch as Julian Day Number
const J2000 = 2451545.0;

// Bounds: ±200 years from J2000.0 in Julian Days
const MIN_JD = J2000 - 200 * 365.25;
const MAX_JD = J2000 + 200 * 365.25;

/** Normalize angle to [0, 360) degrees */
function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Convert a Date to Julian Day Number.
 * Valid for dates in the Gregorian calendar.
 */
export function julianDay(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const h = date.getUTCHours();
  const min = date.getUTCMinutes();
  const s = date.getUTCSeconds();
  const ms = date.getUTCMilliseconds();

  const dayFraction = (h + (min + (s + ms / 1000) / 60) / 60) / 24;

  // Meeus formula (valid for Gregorian calendar)
  let Y = y;
  let M = m;
  if (M <= 2) {
    Y -= 1;
    M += 12;
  }

  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);

  return (
    Math.floor(365.25 * (Y + 4716)) +
    Math.floor(30.6001 * (M + 1)) +
    d +
    dayFraction +
    B -
    1524.5
  );
}

/**
 * Compute the Greenwich Mean Sidereal Time in degrees for a given Julian Day.
 */
export function greenwichMeanSiderealTime(jd: number): number {
  const T = (jd - J2000) / 36525.0;
  // Meeus eq. 12.4
  const gmst =
    280.46061837 +
    360.98564736629 * (jd - J2000) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return normalizeDeg(gmst);
}

/**
 * Compute solar position (declination, right ascension) for a given date.
 */
export function solarPosition(date: Date): SolarPosition {
  const jd = julianDay(date);
  const clampedJd = Math.max(MIN_JD, Math.min(MAX_JD, jd));
  const T = (clampedJd - J2000) / 36525.0;

  // Solar mean longitude (degrees)
  const L0 = normalizeDeg(280.46646 + 36000.76983 * T + 0.0003032 * T * T);

  // Solar mean anomaly (degrees)
  const M_deg = normalizeDeg(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const M = M_deg * DEG_TO_RAD;

  // Equation of center (degrees)
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M);

  // Sun's true longitude (degrees)
  const theta = L0 + C;

  // Mean obliquity of the ecliptic (degrees)
  const eps0 =
    23.439291 - 0.013004 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T;

  // Nutation (simplified)
  const omega_deg = normalizeDeg(125.04 - 1934.136 * T);
  const omega = omega_deg * DEG_TO_RAD;

  // Corrected obliquity (degrees)
  const eps_deg = eps0 + 0.00256 * Math.cos(omega);
  const eps = eps_deg * DEG_TO_RAD;

  // Apparent longitude (degrees → radians)
  const lambda_deg = theta - 0.00569 - 0.00478 * Math.sin(omega);
  const lambda = lambda_deg * DEG_TO_RAD;

  // Solar declination
  const declination = Math.asin(Math.sin(eps) * Math.sin(lambda));

  // Solar right ascension
  const rightAscension = Math.atan2(
    Math.cos(eps) * Math.sin(lambda),
    Math.cos(lambda),
  );

  return {
    declination,
    rightAscension,
    apparentLongitude: lambda,
    obliquity: eps,
  };
}

/**
 * Compute the sun direction vector in the scene's world coordinate system.
 *
 * Three.js SphereGeometry maps texture UV to 3D coordinates such that
 * the center of the texture (U=0.5, the prime meridian) points along +X.
 *
 * Convention:
 * - Y axis = North Pole
 * - +X axis = prime meridian (0° longitude)
 * - +Z axis = 90°W longitude
 * - The globe does NOT rotate; the sun direction changes with time
 *
 * The sun direction accounts for:
 * - Time of day (hour angle / Earth rotation)
 * - Time of year (solar declination from orbital position)
 */
export function sunDirectionVector(date: Date): Vector3 {
  const { declination, rightAscension } = solarPosition(date);
  const jd = julianDay(date);

  // Greenwich Mean Sidereal Time (degrees → radians)
  const gmst = greenwichMeanSiderealTime(jd) * DEG_TO_RAD;

  // Hour angle of the sun at the prime meridian
  const hourAngle = gmst - rightAscension;

  // Subsolar longitude (radians): where the sun is directly overhead
  // sunLon = -(hourAngle) = RA - GMST
  //
  // Convert to Three.js coordinate system where +X = prime meridian:
  //   At longitude λ on the equator, the sphere normal is:
  //     normal.x = cos(λ), normal.z = -sin(λ)
  //
  // So the sun direction (pointing toward the subsolar point) is:
  const cosDec = Math.cos(declination);
  const x = cosDec * Math.cos(hourAngle);
  const y = Math.sin(declination);
  const z = cosDec * Math.sin(hourAngle);

  return new Vector3(x, y, z).normalize();
}

/**
 * Format a date as "YYYY-MM-DD HH:MM:SS UTC"
 */
export function formatDateUTC(date: Date): string {
  const pad = (n: number, digits = 2) => n.toString().padStart(digits, '0');
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`
  );
}

// ── Equinox & solstice finder ────────────────────────────────────────

/** Signed angular difference in [-180, 180] degrees. */
function angleDiff(a: number, b: number): number {
  let d = ((a - b) % 360 + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

/**
 * Find the date of a solstice or equinox for a given year.
 *
 * @param year - Calendar year
 * @param targetLongitude - Sun's apparent ecliptic longitude in degrees:
 *   0 = March equinox, 90 = June solstice,
 *   180 = September equinox, 270 = December solstice.
 * @returns Date accurate to ~1 minute.
 */
export function findEquinoxOrSolstice(year: number, targetLongitude: number): Date {
  // Approximate dates (month is 0-indexed)
  const approx: Record<number, [number, number]> = {
    0: [2, 20],    // March 20
    90: [5, 21],   // June 21
    180: [8, 22],  // September 22
    270: [11, 21], // December 21
  };

  const [month, day] = approx[targetLongitude] ?? [2, 20];
  const center = Date.UTC(year, month, day, 12, 0, 0);
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

  let lo = center - THREE_DAYS_MS;
  let hi = center + THREE_DAYS_MS;

  // Binary search: find when apparentLongitude crosses targetLongitude
  for (let i = 0; i < 25; i++) {
    const mid = (lo + hi) / 2;
    const pos = solarPosition(new Date(mid));
    const lonDeg = normalizeDeg(pos.apparentLongitude * RAD_TO_DEG);
    const diff = angleDiff(lonDeg, targetLongitude);

    if (diff < 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return new Date((lo + hi) / 2);
}

// ── Sun data for a given observer location ──────────────────────────

export interface SunData {
  /** Solar elevation (altitude) in degrees, negative = below horizon */
  elevation: number;
  /** Solar azimuth in degrees, 0=N, 90=E, 180=S, 270=W */
  azimuth: number;
  /** Sunrise time (UTC) or null if polar day/night */
  sunrise: Date | null;
  /** Sunset time (UTC) or null if polar day/night */
  sunset: Date | null;
  /** Day length in hours, or 24 (polar day) or 0 (polar night) */
  dayLength: number;
  /** Solar noon (UTC) — time when sun is highest */
  solarNoon: Date;
  /** Status description */
  status: string;
}

/**
 * Compute solar elevation and azimuth for a given date and observer location.
 */
export function sunElevationAzimuth(
  date: Date,
  latDeg: number,
  lonDeg: number,
): { elevation: number; azimuth: number } {
  const { declination, rightAscension } = solarPosition(date);
  const jd = julianDay(date);
  const gmst = greenwichMeanSiderealTime(jd) * DEG_TO_RAD;

  const lat = latDeg * DEG_TO_RAD;
  const localSiderealTime = gmst + lonDeg * DEG_TO_RAD;
  const hourAngle = localSiderealTime - rightAscension;

  const sinElev =
    Math.sin(lat) * Math.sin(declination) +
    Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinElev))) * RAD_TO_DEG;

  // Azimuth: measured clockwise from North
  const cosElev = Math.cos(elevation * DEG_TO_RAD);
  let azimuth: number;
  if (cosElev < 1e-10) {
    azimuth = 0;
  } else {
    const sinAz =
      (-Math.cos(declination) * Math.sin(hourAngle)) / cosElev;
    const cosAz =
      (Math.sin(declination) - Math.sin(lat) * sinElev) /
      (Math.cos(lat) * cosElev);
    azimuth = Math.atan2(sinAz, cosAz) * RAD_TO_DEG;
    if (azimuth < 0) azimuth += 360;
  }

  return { elevation, azimuth };
}

/**
 * Compute the equation of time (minutes) for a given date.
 * Returns the difference between apparent solar time and mean solar time.
 */
function equationOfTime(date: Date): number {
  const { rightAscension } = solarPosition(date);
  const jd = julianDay(date);
  const T = (jd - J2000) / 36525.0;
  const L0 = normalizeDeg(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const L0rad = L0 * DEG_TO_RAD;
  let raAdj = rightAscension;
  if (raAdj < 0) raAdj += 2 * Math.PI;
  // Equation of time in radians, then convert to minutes
  let eot = L0rad - raAdj;
  // Normalize to [-π, π]
  while (eot > Math.PI) eot -= 2 * Math.PI;
  while (eot < -Math.PI) eot += 2 * Math.PI;
  return eot * (720 / Math.PI); // radians to minutes
}

/**
 * Compute sunrise, sunset, solar noon, day length for a given date and location.
 * Uses the standard -0.833° correction for atmospheric refraction + solar disc.
 */
export function sunriseSunset(
  date: Date,
  latDeg: number,
  lonDeg: number,
): {
  sunrise: Date | null;
  sunset: Date | null;
  solarNoon: Date;
  dayLength: number;
} {
  // Work with the same calendar day at noon UTC for stable calculations
  const noon = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    12, 0, 0,
  ));

  const { declination } = solarPosition(noon);
  const lat = latDeg * DEG_TO_RAD;

  // Solar noon: 12:00 UTC minus equation of time, adjusted for longitude
  const eotMinutes = equationOfTime(noon);
  const solarNoonMinutes = 720 - lonDeg * 4 - eotMinutes; // minutes from midnight UTC
  const solarNoonDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
  solarNoonDate.setUTCMinutes(Math.round(solarNoonMinutes));

  // Hour angle at sunrise/sunset
  // cos(HA) = (sin(-0.833°) - sin(lat) * sin(dec)) / (cos(lat) * cos(dec))
  const sinCorr = Math.sin(-0.833 * DEG_TO_RAD);
  const denominator = Math.cos(lat) * Math.cos(declination);

  if (Math.abs(denominator) < 1e-10) {
    // At the pole: check if sun is up or down
    const sinElev = Math.sin(lat) * Math.sin(declination);
    if (sinElev > sinCorr) {
      return { sunrise: null, sunset: null, solarNoon: solarNoonDate, dayLength: 24 };
    }
    return { sunrise: null, sunset: null, solarNoon: solarNoonDate, dayLength: 0 };
  }

  const cosHA =
    (sinCorr - Math.sin(lat) * Math.sin(declination)) / denominator;

  if (cosHA < -1) {
    // Polar day — sun never sets
    return { sunrise: null, sunset: null, solarNoon: solarNoonDate, dayLength: 24 };
  }
  if (cosHA > 1) {
    // Polar night — sun never rises
    return { sunrise: null, sunset: null, solarNoon: solarNoonDate, dayLength: 0 };
  }

  const haMinutes = Math.acos(cosHA) * RAD_TO_DEG * 4; // degrees to minutes (1° = 4 min)

  const sunriseMinutes = solarNoonMinutes - haMinutes;
  const sunsetMinutes = solarNoonMinutes + haMinutes;
  const dayLength = (2 * haMinutes) / 60;

  const baseDate = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );

  return {
    sunrise: new Date(baseDate + sunriseMinutes * 60000),
    sunset: new Date(baseDate + sunsetMinutes * 60000),
    solarNoon: solarNoonDate,
    dayLength,
  };
}

/**
 * Compute all sun data for a given date and observer location.
 */
export function computeSunData(
  date: Date,
  latDeg: number,
  lonDeg: number,
): SunData {
  const { elevation, azimuth } = sunElevationAzimuth(date, latDeg, lonDeg);
  const { sunrise, sunset, solarNoon, dayLength } = sunriseSunset(date, latDeg, lonDeg);

  let status: string;
  if (dayLength >= 24) {
    status = 'Polar day (24h sun)';
  } else if (dayLength <= 0) {
    status = 'Polar night (no sun)';
  } else if (elevation > 0) {
    // Determine morning/afternoon based on azimuth
    status = azimuth < 180 ? 'Day (morning)' : 'Day (afternoon)';
  } else if (elevation > -6) {
    status = 'Civil twilight';
  } else if (elevation > -12) {
    status = 'Nautical twilight';
  } else if (elevation > -18) {
    status = 'Astronomical twilight';
  } else {
    status = 'Night';
  }

  return { elevation, azimuth, sunrise, sunset, dayLength, solarNoon, status };
}

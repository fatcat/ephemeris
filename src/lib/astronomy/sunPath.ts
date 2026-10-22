/**
 * Sun paths across the local sky: where the sun travels over one day,
 * as seen by an observer at a given location.
 *
 * Pure math, no rendering. Used by the sky dome view.
 */

import { sunElevationAzimuth, sunriseSunset, findEquinoxOrSolstice } from './solar.js';

const HOUR_MS = 3_600_000;

export interface SkyPoint {
  /** Degrees clockwise from north */
  azimuth: number;
  /** Degrees above the horizon */
  elevation: number;
}

export interface HourMarker extends SkyPoint {
  /** Hours from solar noon (-3 = 9 a.m. solar time) */
  hourOffset: number;
}

/**
 * The above-horizon part of the sun's path for the solar day containing `date`.
 * Sampled every `stepMin` minutes from solar midnight to solar midnight. Where
 * the path crosses the horizon, the crossing point is interpolated so the line
 * ends exactly at elevation 0. Empty during polar night.
 *
 * Elevation only rises toward solar noon and falls after it, so the visible
 * part is always one unbroken arc.
 */
export function sunPathForDay(
  date: Date,
  latDeg: number,
  lonDeg: number,
  obliquityDeg?: number,
  stepMin = 10,
): SkyPoint[] {
  const noon = sunriseSunset(date, latDeg, lonDeg, obliquityDeg).solarNoon.getTime();
  const steps = Math.round((24 * 60) / stepMin);
  const points: SkyPoint[] = [];
  let prev: SkyPoint | null = null;

  for (let i = 0; i <= steps; i++) {
    const t = noon - 12 * HOUR_MS + i * stepMin * 60_000;
    const cur = sunElevationAzimuth(new Date(t), latDeg, lonDeg, obliquityDeg);

    if (prev && (prev.elevation < 0) !== (cur.elevation < 0)) {
      points.push(horizonCrossing(prev, cur));
    }
    if (cur.elevation >= 0) points.push(cur);
    prev = cur;
  }
  return points;
}

/** Linearly interpolate the azimuth where the path between a and b meets the horizon. */
function horizonCrossing(a: SkyPoint, b: SkyPoint): SkyPoint {
  const f = a.elevation / (a.elevation - b.elevation);
  // Take the short way around north when azimuth wraps 359° → 1°
  let dAz = b.azimuth - a.azimuth;
  if (dAz > 180) dAz -= 360;
  if (dAz < -180) dAz += 360;
  const azimuth = (a.azimuth + f * dAz + 360) % 360;
  return { azimuth, elevation: 0 };
}

/**
 * Sun position at each whole hour of solar time (solar noon ± n hours)
 * while the sun is above the horizon.
 */
export function solarHourMarkers(
  date: Date,
  latDeg: number,
  lonDeg: number,
  obliquityDeg?: number,
): HourMarker[] {
  const noon = sunriseSunset(date, latDeg, lonDeg, obliquityDeg).solarNoon.getTime();
  const markers: HourMarker[] = [];
  for (let h = -12; h <= 12; h++) {
    const p = sunElevationAzimuth(new Date(noon + h * HOUR_MS), latDeg, lonDeg, obliquityDeg);
    if (p.elevation > 0) markers.push({ ...p, hourOffset: h });
  }
  return markers;
}

export type SeasonalPathId = 'marchEquinox' | 'juneSolstice' | 'decemberSolstice';

export interface SeasonalPath {
  id: SeasonalPathId;
  date: Date;
  points: SkyPoint[];
}

/**
 * Sun paths on the June solstice, March equinox and December solstice of `year`.
 * The September equinox path is nearly identical to March's, so it's omitted.
 */
export function seasonalPaths(
  year: number,
  latDeg: number,
  lonDeg: number,
  obliquityDeg?: number,
): SeasonalPath[] {
  const events: [SeasonalPathId, number][] = [
    ['juneSolstice', 90],
    ['marchEquinox', 0],
    ['decemberSolstice', 270],
  ];
  return events.map(([id, solarLon]) => {
    const date = findEquinoxOrSolstice(year, solarLon);
    return { id, date, points: sunPathForDay(date, latDeg, lonDeg, obliquityDeg) };
  });
}

/** Display names for the seasonal paths */
export const SEASONAL_PATH_NAMES: Record<SeasonalPathId, string> = {
  juneSolstice: 'June solstice',
  marchEquinox: 'Equinoxes',
  decemberSolstice: 'December solstice',
};

/** Legend text for a seasonal path, noting when the sun doesn't rise that day */
export function seasonalPathLabel(id: SeasonalPathId, info: SeasonalPathInfo): string {
  return info.rises ? SEASONAL_PATH_NAMES[id] : `${SEASONAL_PATH_NAMES[id]} (sun never rises)`;
}

/** How a path relates to the observer's seasons: the higher solstice is summer */
export type PathRole = 'summer' | 'winter' | 'equinox';

export interface SeasonalPathInfo {
  role: PathRole;
  /** False when the sun never rises that day (polar night) */
  rises: boolean;
}

/** Solstice peaks closer than this count as equal: no seasons (axial tilt near 0). */
const NO_SEASON_EPSILON_DEG = 0.5;

/** Color role and visibility of each seasonal path */
export function seasonalPathInfo(paths: SeasonalPath[]): Record<SeasonalPathId, SeasonalPathInfo> {
  const peak = (id: SeasonalPathId) =>
    (paths.find((s) => s.id === id)?.points ?? []).reduce((m, p) => Math.max(m, p.elevation), -90);
  const diff = peak('juneSolstice') - peak('decemberSolstice');
  const noSeasons = Math.abs(diff) < NO_SEASON_EPSILON_DEG;
  const roleOf: Record<SeasonalPathId, PathRole> = {
    juneSolstice: noSeasons ? 'equinox' : diff > 0 ? 'summer' : 'winter',
    marchEquinox: 'equinox',
    decemberSolstice: noSeasons ? 'equinox' : diff > 0 ? 'winter' : 'summer',
  };
  return Object.fromEntries(
    paths.map((s) => [s.id, { role: roleOf[s.id], rises: s.points.length > 1 }]),
  ) as Record<SeasonalPathId, SeasonalPathInfo>;
}

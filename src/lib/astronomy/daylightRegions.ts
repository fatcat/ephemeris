/**
 * Where on Earth the sun is below a given altitude, for flat world maps.
 *
 * Along one meridian, the sun's altitude is sin(alt) = A·sin(lat) + B·cos(lat)
 * with A = sin(dec) and B = cos(dec)·cos(lon − subsolar lon). That is
 * R·cos(lat − α), so each meridian's dark stretch has a closed form. For any
 * altitude at or below 0° it is one unbroken stretch of latitude, which lets a
 * region be drawn as columns joined into polygons.
 */

import { greenwichMeanSiderealTime, julianDay, solarPosition } from './solar.js';

const DEG = Math.PI / 180;

export interface GeoPoint {
  lat: number;
  lon: number;
}

/** Altitudes that bound night, then civil, nautical and astronomical twilight */
export const TWILIGHT_LIMITS = [0, -6, -12, -18] as const;

/** Wrap a longitude into [-180, 180) */
export function wrapLongitude(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/** The point where the sun is straight overhead */
export function subsolarPoint(date: Date): GeoPoint {
  const { declination, rightAscension } = solarPosition(date);
  const gmst = greenwichMeanSiderealTime(julianDay(date));
  return { lat: declination / DEG, lon: wrapLongitude(rightAscension / DEG - gmst) };
}

/** The latitudes on one meridian where the sun is below the altitude */
export interface DarkColumn {
  lon: number;
  south: number;
  north: number;
}

/** The dark stretch of one meridian, or null when the sun is above the altitude all along it */
export function darkColumn(sub: GeoPoint, altitudeDeg: number, lon: number): DarkColumn | null {
  const a = Math.sin(sub.lat * DEG);
  const b = Math.cos(sub.lat * DEG) * Math.cos((lon - sub.lon) * DEG);
  const r = Math.hypot(a, b);
  // Only when the sun sits on the horizon all along this meridian
  if (r < 1e-12) return altitudeDeg > 0 ? { lon, south: -90, north: 90 } : null;
  const k = Math.sin(altitudeDeg * DEG) / r;
  if (k <= -1) return null;
  if (k >= 1) return { lon, south: -90, north: 90 };

  // Sunlit within acos(k) of α (the latitude nearest the sun, which may lie past a pole);
  // the dark arc is the rest of the meridian's full circle
  const alpha = Math.atan2(a, b) / DEG;
  const half = 180 - Math.acos(k) / DEG;
  const center = alpha + 180;

  let best: DarkColumn | null = null;
  for (const shift of [-360, 0, 360]) {
    const south = Math.max(-90, center + shift - half);
    const north = Math.min(90, center + shift + half);
    if (north - south > 1e-9 && (!best || north - south > best.north - best.south)) {
      best = { lon, south, north };
    }
  }
  return best;
}

/**
 * The region below `altitudeDeg` as runs of neighboring columns, one per degree
 * of longitude from `westLon` eastward around the globe. A run ends where a
 * meridian has no dark stretch.
 */
export function darkRegion(sub: GeoPoint, altitudeDeg: number, westLon: number, stepDeg = 1): DarkColumn[][] {
  const runs: DarkColumn[][] = [];
  let run: DarkColumn[] = [];
  for (let lon = westLon; lon <= westLon + 360 + 1e-9; lon += stepDeg) {
    const col = darkColumn(sub, altitudeDeg, lon);
    if (col) {
      run.push(col);
    } else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  return runs.filter((r) => r.length > 1);
}

/** SVG path data for a region: each run's north edge eastward, then its south edge back */
export function regionPathData(
  runs: DarkColumn[][],
  x: (lon: number) => number,
  y: (lat: number) => number,
): string {
  const pt = (lon: number, lat: number) => `${x(lon).toFixed(1)} ${y(lat).toFixed(1)}`;
  return runs
    .map((run) => {
      const north = run.map((c) => pt(c.lon, c.north));
      const south = run.map((c) => pt(c.lon, c.south)).reverse();
      return `M${[...north, ...south].join('L')}Z`;
    })
    .join('');
}

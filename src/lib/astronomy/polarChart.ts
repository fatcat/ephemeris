/**
 * The 2D sun-path chart: the sky flattened onto a disk, horizon at the rim and
 * the zenith in the middle. Elevation maps linearly to radius.
 *
 * Pure math, no rendering. Used by the Home Assistant sky card.
 */

import type { SkyPoint } from './sunPath.js';

/**
 * - `north_up`: the standard sun-path chart, north at the top and east on the right
 *   (a map of the sky seen from below, in both hemispheres).
 * - `facing_sun`: standing with your back to the pole, looking at the equator-side sky.
 *   In the northern hemisphere that's a 180° turn of `north_up`; in the southern it is
 *   `north_up` already. Always a rotation, never a mirror, so it matches the app's dome.
 */
export type ChartOrientation = 'north_up' | 'facing_sun';

export interface ChartFrame {
  cx: number;
  cy: number;
  /** Radius of the horizon circle */
  radius: number;
  /** Degrees added to every azimuth before drawing */
  rotation: number;
}

export interface ChartPoint {
  x: number;
  y: number;
}

export function chartFrame(
  orientation: ChartOrientation,
  latDeg: number,
  cx: number,
  cy: number,
  radius: number,
): ChartFrame {
  return { cx, cy, radius, rotation: orientation === 'facing_sun' && latDeg >= 0 ? 180 : 0 };
}

/** Chart position of a sky direction. `outset` pushes it past its radius (for labels). */
export function project(frame: ChartFrame, azimuthDeg: number, elevationDeg: number, outset = 0): ChartPoint {
  const r = (frame.radius * (90 - elevationDeg)) / 90 + outset;
  const a = ((azimuthDeg + frame.rotation) * Math.PI) / 180;
  return { x: frame.cx + r * Math.sin(a), y: frame.cy - r * Math.cos(a) };
}

/** SVG path data for an above-horizon path. Empty when there are no points. */
export function pathData(frame: ChartFrame, points: SkyPoint[]): string {
  return points
    .map((p, i) => {
      const { x, y } = project(frame, p.azimuth, p.elevation);
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join('');
}

/** Compass letters for the top, right, bottom and left of the chart */
export function compassLabels(frame: ChartFrame): { top: string; right: string; bottom: string; left: string } {
  return frame.rotation
    ? { top: 'S', right: 'W', bottom: 'N', left: 'E' }
    : { top: 'N', right: 'E', bottom: 'S', left: 'W' };
}

/**
 * Share of full direct sunlight striking a tilted surface: the cosine of the
 * angle between the sun and the surface's normal, 0 when the sun is behind it
 * or below the horizon. Ignores clouds, haze and shading.
 */
export function directBeamFraction(sun: SkyPoint, tiltDeg: number, azimuthDeg: number): number {
  if (sun.elevation <= 0) return 0;
  const d = Math.PI / 180;
  const se = sun.elevation * d;
  const sa = sun.azimuth * d;
  const t = tiltDeg * d;
  const pa = azimuthDeg * d;
  const cosIncidence =
    Math.cos(se) * Math.sin(t) * Math.cos(sa - pa) + Math.sin(se) * Math.cos(t);
  return Math.max(0, cosIncidence);
}

/** The sky direction a tilted surface faces: its normal, as azimuth and elevation */
export function surfaceNormal(tiltDeg: number, azimuthDeg: number): SkyPoint {
  return { azimuth: azimuthDeg, elevation: 90 - tiltDeg };
}

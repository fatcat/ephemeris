/**
 * Orthographic projection: the globe as seen from far away, centered on one point.
 * Screen coordinates are in a unit disk, x to the right and y up.
 */

import { wrapLongitude, type GeoPoint } from '../../lib/astronomy/daylightRegions.js';

const DEG = Math.PI / 180;

export interface DiskPoint {
  x: number;
  y: number;
  /** False on the far side of the globe */
  visible: boolean;
}

export function project(center: GeoPoint, p: GeoPoint): DiskPoint {
  const phi0 = center.lat * DEG;
  const phi = p.lat * DEG;
  const dl = (p.lon - center.lon) * DEG;
  const cosC = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(dl);
  return {
    x: Math.cos(phi) * Math.sin(dl),
    y: Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(dl),
    visible: cosC >= 0,
  };
}

/** The point under a spot on the disk, or null outside it */
export function unproject(center: GeoPoint, x: number, y: number): GeoPoint | null {
  const rho = Math.hypot(x, y);
  if (rho > 1) return null;
  if (rho === 0) return { lat: center.lat, lon: center.lon };
  const phi0 = center.lat * DEG;
  const c = Math.asin(rho);
  const lat = Math.asin(Math.cos(c) * Math.sin(phi0) + (y * Math.sin(c) * Math.cos(phi0)) / rho);
  const lon =
    center.lon * DEG +
    Math.atan2(x * Math.sin(c), rho * Math.cos(c) * Math.cos(phi0) - y * Math.sin(c) * Math.sin(phi0));
  return { lat: lat / DEG, lon: wrapLongitude(lon / DEG) };
}

/**
 * A line of latitude as SVG path data on a disk of the given radius centered at (r, r),
 * with screen y down. The far side is left out, so the path may have several pieces.
 */
export function parallelPathData(center: GeoPoint, lat: number, r: number, stepDeg = 2): string {
  let d = '';
  let drawing = false;
  for (let lon = -180; lon <= 180; lon += stepDeg) {
    const p = project(center, { lat, lon });
    if (!p.visible) {
      drawing = false;
      continue;
    }
    d += `${drawing ? 'L' : 'M'}${(r + p.x * r).toFixed(1)} ${(r - p.y * r).toFixed(1)}`;
    drawing = true;
  }
  return d;
}

/**
 * Geographic coordinate conversion utilities.
 *
 * Shared between globe (3D sphere) and projection (2D plane) renderers.
 */

const DEG_TO_RAD = Math.PI / 180;

/**
 * Convert geographic (lat, lon) to a 3D position on the globe sphere.
 *
 * Matches Three.js SphereGeometry UV convention:
 *   phi = (lon + 180) * pi / 180  →  prime meridian maps to +X axis
 *   theta = (90 - lat) * pi / 180
 */
export function geoToGlobePosition(
  latDeg: number,
  lonDeg: number,
  r: number,
): [number, number, number] {
  const phi = (lonDeg + 180) * DEG_TO_RAD;
  const theta = (90 - latDeg) * DEG_TO_RAD;
  const sinTheta = Math.sin(theta);
  const x = -Math.cos(phi) * sinTheta * r;
  const y = Math.cos(theta) * r;
  const z = Math.sin(phi) * sinTheta * r;
  return [x, y, z];
}

/**
 * Convert geographic (lat, lon) to a position on the equirectangular projection plane.
 *
 * The projection plane is 2 units wide × 1 unit tall, centered at origin.
 *   x = lon / 180  (range -1 to 1)
 *   y = lat / 180  (range -0.5 to 0.5)
 *   z = small offset to avoid z-fighting with the textured plane
 */
export function geoToProjectionPosition(
  latDeg: number,
  lonDeg: number,
): [number, number, number] {
  return [lonDeg / 180, latDeg / 180, 0.001];
}

/** Convert longitude to CSS percentage (0% = left edge at -180°, 100% = right edge at 180°). */
export function lonToPercent(lon: number): number {
  return (0.5 + lon / 360) * 100;
}

/** Convert latitude to CSS percentage (0% = top edge at 90°N, 100% = bottom edge at 90°S). */
export function latToPercent(lat: number): number {
  return (1 - (0.5 + lat / 180)) * 100;
}

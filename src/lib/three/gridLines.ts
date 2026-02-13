/**
 * Latitude/longitude grid line geometry for the 3D globe.
 *
 * Major lines every 15°, minor lines every 5°.
 * Special latitude lines: equator, tropics, arctic/antarctic circles.
 * Lines are rendered slightly above the sphere surface to avoid z-fighting.
 */

import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
} from 'three';

const GRID_RADIUS = 1.003; // slightly above the 1.0 sphere
const SEGMENTS_PER_CIRCLE = 128;
const MAJOR_COLOR = 0x777777;
const MINOR_COLOR = 0x4a4a4a;
const MAJOR_OPACITY = 0.4;
const MINOR_OPACITY = 0.2;

// Special line colors
const EQUATOR_TROPICS_COLOR = 0xd4a44c; // warm amber/gold
const ARCTIC_CIRCLES_COLOR = 0xb0e0ff;  // bright ice-white cyan
const SPECIAL_OPACITY = 0.85;
const ARCTIC_OPACITY = 1.0;

const DEFAULT_TILT = 23.44;

export interface GlobeGrid {
  group: Group;
  majorLines: Group;
  minorLines: Group;
  equatorTropicsLines: Group;
  arcticCircleLines: Group;
}

/**
 * Convert geographic (lat, lon) to Three.js position on the SphereGeometry.
 * Matches SphereGeometry's formula:
 *   phi = (lon + 180) * π / 180  (maps prime meridian to phi=π → +X axis)
 *   theta = (90 - lat) * π / 180
 */
function geoToPosition(
  latDeg: number,
  lonDeg: number,
  r: number,
): [number, number, number] {
  const phi = ((lonDeg + 180) * Math.PI) / 180;
  const theta = ((90 - latDeg) * Math.PI) / 180;
  const x = -Math.cos(phi) * Math.sin(theta) * r;
  const y = Math.cos(theta) * r;
  const z = Math.sin(phi) * Math.sin(theta) * r;
  return [x, y, z];
}

function createLatitudeCircle(latDeg: number, r: number): number[] {
  const positions: number[] = [];
  for (let i = 0; i < SEGMENTS_PER_CIRCLE; i++) {
    const lon0 = (i / SEGMENTS_PER_CIRCLE) * 360 - 180;
    const lon1 = ((i + 1) / SEGMENTS_PER_CIRCLE) * 360 - 180;
    const [x0, y0, z0] = geoToPosition(latDeg, lon0, r);
    const [x1, y1, z1] = geoToPosition(latDeg, lon1, r);
    positions.push(x0, y0, z0, x1, y1, z1);
  }
  return positions;
}

function createLongitudeArc(lonDeg: number, r: number): number[] {
  const positions: number[] = [];
  for (let i = 0; i < SEGMENTS_PER_CIRCLE; i++) {
    const lat0 = -90 + (i / SEGMENTS_PER_CIRCLE) * 180;
    const lat1 = -90 + ((i + 1) / SEGMENTS_PER_CIRCLE) * 180;
    const [x0, y0, z0] = geoToPosition(lat0, lonDeg, r);
    const [x1, y1, z1] = geoToPosition(lat1, lonDeg, r);
    positions.push(x0, y0, z0, x1, y1, z1);
  }
  return positions;
}

function buildLineGroup(positions: number[], color: number, opacity: number): Group {
  const group = new Group();
  if (positions.length === 0) return group;

  const mat = new LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const geom = new BufferGeometry();
  geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
  group.add(new LineSegments(geom, mat));
  return group;
}

/** Dispose all children (LineSegments) from a group. */
function clearLineGroup(group: Group): void {
  for (const child of group.children) {
    if (child instanceof LineSegments) {
      child.geometry.dispose();
      if (child.material instanceof LineBasicMaterial) {
        child.material.dispose();
      }
    }
  }
  group.clear();
}

/** Build the equator + tropics lines for a given tilt. */
function buildEquatorTropicsGroup(tiltDeg: number): Group {
  const positions: number[] = [];
  positions.push(...createLatitudeCircle(0, GRID_RADIUS)); // equator always at 0°
  positions.push(...createLatitudeCircle(tiltDeg, GRID_RADIUS));
  positions.push(...createLatitudeCircle(-tiltDeg, GRID_RADIUS));
  return buildLineGroup(positions, EQUATOR_TROPICS_COLOR, SPECIAL_OPACITY);
}

/** Build the arctic/antarctic circle lines for a given tilt. */
function buildArcticCirclesGroup(tiltDeg: number): Group {
  const arcticLat = 90 - tiltDeg;
  const positions: number[] = [];
  positions.push(...createLatitudeCircle(arcticLat, GRID_RADIUS));
  positions.push(...createLatitudeCircle(-arcticLat, GRID_RADIUS));
  return buildLineGroup(positions, ARCTIC_CIRCLES_COLOR, ARCTIC_OPACITY);
}

export function createGlobeGrid(tiltDeg: number = DEFAULT_TILT): GlobeGrid {
  const group = new Group();

  const majorPositions: number[] = [];
  const minorPositions: number[] = [];

  // Regular grid latitude lines
  for (let lat = -90; lat <= 90; lat += 5) {
    if (lat === -90 || lat === 90) continue; // poles are just points
    const isMajor = lat % 15 === 0;
    const target = isMajor ? majorPositions : minorPositions;
    target.push(...createLatitudeCircle(lat, GRID_RADIUS));
  }

  // Regular grid longitude lines
  for (let lon = -180; lon < 180; lon += 5) {
    const isMajor = lon % 15 === 0;
    const target = isMajor ? majorPositions : minorPositions;
    target.push(...createLongitudeArc(lon, GRID_RADIUS));
  }

  const majorLines = buildLineGroup(majorPositions, MAJOR_COLOR, MAJOR_OPACITY);
  const minorLines = buildLineGroup(minorPositions, MINOR_COLOR, MINOR_OPACITY);

  // Special latitude lines — built from the current tilt
  const equatorTropicsLines = buildEquatorTropicsGroup(tiltDeg);
  const arcticCircleLines = buildArcticCirclesGroup(tiltDeg);

  group.add(majorLines);
  group.add(minorLines);
  group.add(equatorTropicsLines);
  group.add(arcticCircleLines);

  return { group, majorLines, minorLines, equatorTropicsLines, arcticCircleLines };
}

/**
 * Rebuild the special latitude lines (tropics + arctic circles) for a new tilt.
 * Disposes old geometry and creates new LineSegments in place.
 */
export function updateSpecialLatitudes(grid: GlobeGrid, tiltDeg: number): void {
  // Rebuild equator + tropics
  clearLineGroup(grid.equatorTropicsLines);
  const newEqTropic = buildEquatorTropicsGroup(tiltDeg);
  for (const child of [...newEqTropic.children]) {
    newEqTropic.remove(child);
    grid.equatorTropicsLines.add(child);
  }

  // Rebuild arctic circles
  clearLineGroup(grid.arcticCircleLines);
  const newArctic = buildArcticCirclesGroup(tiltDeg);
  for (const child of [...newArctic.children]) {
    newArctic.remove(child);
    grid.arcticCircleLines.add(child);
  }
}

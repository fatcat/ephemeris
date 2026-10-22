import { describe, expect, it } from 'vitest';
import { chartFrame, compassLabels, directBeamFraction, pathData, project } from './polarChart.js';
import { seasonalPathInfo, seasonalPaths } from './sunPath.js';

const close = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  expect(a.x).toBeCloseTo(b.x, 6);
  expect(a.y).toBeCloseTo(b.y, 6);
};

describe('project', () => {
  const north = chartFrame('north_up', 60, 180, 180, 150);

  it('puts the zenith in the middle and the horizon on the rim', () => {
    close(project(north, 123, 90), { x: 180, y: 180 });
    close(project(north, 0, 0), { x: 180, y: 30 });
    close(project(north, 90, 0), { x: 330, y: 180 });
    close(project(north, 180, 45), { x: 180, y: 255 });
  });

  it('turns 180° when facing the sun in the north, never mirrors', () => {
    const facing = chartFrame('facing_sun', 60, 180, 180, 150);
    close(project(facing, 180, 0), { x: 180, y: 30 });
    // East stays a quarter turn clockwise from north: on the left once south is up
    close(project(facing, 90, 0), { x: 30, y: 180 });
    expect(compassLabels(facing)).toEqual({ top: 'S', right: 'W', bottom: 'N', left: 'E' });
  });

  it('facing the sun in the south is already north up', () => {
    const south = chartFrame('facing_sun', -33.9, 180, 180, 150);
    expect(south.rotation).toBe(0);
    expect(compassLabels(south).top).toBe('N');
  });

  it('writes path data', () => {
    expect(pathData(north, [])).toBe('');
    expect(pathData(north, [{ azimuth: 90, elevation: 0 }, { azimuth: 180, elevation: 90 }])).toBe('M330.0 180.0L180.0 180.0');
  });
});

describe('directBeamFraction', () => {
  it('is 1 when the sun is square to the panel', () => {
    expect(directBeamFraction({ azimuth: 180, elevation: 55 }, 35, 180)).toBeCloseTo(1, 6);
    expect(directBeamFraction({ azimuth: 0, elevation: 90 }, 0, 0)).toBeCloseTo(1, 6);
  });

  it('is cos(incidence) at an angle, and 0 behind the panel or below the horizon', () => {
    expect(directBeamFraction({ azimuth: 180, elevation: 30 }, 0, 180)).toBeCloseTo(0.5, 6);
    expect(directBeamFraction({ azimuth: 90, elevation: 10 }, 90, 270)).toBe(0);
    expect(directBeamFraction({ azimuth: 180, elevation: -1 }, 35, 180)).toBe(0);
  });
});

describe('seasonalPathInfo', () => {
  it('makes the higher solstice summer in each hemisphere', () => {
    const north = seasonalPathInfo(seasonalPaths(2026, 59.9, 10.75));
    expect(north.juneSolstice.role).toBe('summer');
    expect(north.decemberSolstice.role).toBe('winter');
    const south = seasonalPathInfo(seasonalPaths(2026, -33.9, 151.2));
    expect(south.decemberSolstice.role).toBe('summer');
  });

  it('notes polar night', () => {
    const tromso = seasonalPathInfo(seasonalPaths(2026, 69.65, 18.96));
    expect(tromso.decemberSolstice.rises).toBe(false);
    expect(tromso.juneSolstice.rises).toBe(true);
  });

  it('has no seasons at zero tilt', () => {
    const flat = seasonalPathInfo(seasonalPaths(2026, 45, 0, 0));
    expect(flat.juneSolstice.role).toBe('equinox');
    expect(flat.decemberSolstice.role).toBe('equinox');
  });
});

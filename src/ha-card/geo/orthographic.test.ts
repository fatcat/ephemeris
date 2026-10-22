import { describe, expect, it } from 'vitest';
import { parallelPathData, project, unproject } from './orthographic.js';

const home = { lat: 33.4, lon: -84.6 };

describe('orthographic projection', () => {
  it('puts the center in the middle', () => {
    const p = project(home, home);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(0);
    expect(p.visible).toBe(true);
  });

  it('hides the far side', () => {
    expect(project(home, { lat: -33.4, lon: 95.4 }).visible).toBe(false);
    expect(project(home, { lat: 0, lon: -84.6 }).visible).toBe(true);
  });

  it('puts north up and east to the right', () => {
    expect(project(home, { lat: 90, lon: 0 }).y).toBeGreaterThan(0);
    expect(project(home, { lat: 33.4, lon: -60 }).x).toBeGreaterThan(0);
  });

  it('round-trips visible points', () => {
    for (const p of [
      { lat: 10, lon: -100 },
      { lat: 70, lon: -20 },
      { lat: -40, lon: -70 },
      { lat: 80, lon: 170 },
    ]) {
      const d = project(home, p);
      expect(d.visible).toBe(true);
      const back = unproject(home, d.x, d.y)!;
      expect(back.lat).toBeCloseTo(p.lat, 6);
      expect(back.lon).toBeCloseTo(p.lon, 6);
    }
  });

  it('is null outside the disk', () => {
    expect(unproject(home, 0.8, 0.8)).toBeNull();
  });

  it('draws only the near side of a parallel', () => {
    const d = parallelPathData({ lat: 0, lon: 0 }, 0, 100);
    // The equator seen from (0, 0) runs edge to edge through the middle
    expect(d.startsWith('M0.0 100.0')).toBe(true);
    expect(d).toContain('100.0 100.0');
    expect(d.endsWith('200.0 100.0')).toBe(true);
  });
});

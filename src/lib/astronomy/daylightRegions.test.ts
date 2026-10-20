import { describe, expect, it } from 'vitest';
import { darkColumn, darkRegion, regionPathData, subsolarPoint, wrapLongitude } from './daylightRegions.js';
import { findEquinoxOrSolstice, sunElevationAzimuth } from './solar.js';

const elevation = (date: Date, lat: number, lon: number) => sunElevationAzimuth(date, lat, lon).elevation;

const JUNE = findEquinoxOrSolstice(2026, 90);
const MARCH = findEquinoxOrSolstice(2026, 0);
const MOMENTS = [JUNE, MARCH, new Date('2026-10-20T07:13:00Z'), new Date('2026-12-21T19:40:00Z')];

describe('wrapLongitude', () => {
  it.each([
    [0, 0],
    [180, -180],
    [-180, -180],
    [190, -170],
    [-190, 170],
    [725, 5],
  ])('%d → %d', (lon, out) => expect(wrapLongitude(lon)).toBeCloseTo(out, 9));
});

describe('subsolarPoint', () => {
  it.each(MOMENTS.map((d) => [d.toISOString(), d] as const))('puts the sun overhead at %s', (_, date) => {
    const sub = subsolarPoint(date);
    expect(elevation(date, sub.lat, sub.lon)).toBeGreaterThan(89.9);
  });

  it('sits on the Tropic of Cancer at the June solstice', () => {
    expect(subsolarPoint(JUNE).lat).toBeCloseTo(23.44, 1);
  });
});

describe('darkColumn', () => {
  it.each(
    MOMENTS.flatMap((date) => [0, -0.833, -6, -12, -18].map((alt) => [date.toISOString(), alt, date] as const)),
  )('edges sit at the altitude (%s, %d°)', (_, alt, date) => {
    const sub = subsolarPoint(date);
    for (let lon = -180; lon < 180; lon += 7) {
      const col = darkColumn(sub, alt, lon);
      if (!col) {
        expect(elevation(date, 0, lon) > alt || elevation(date, 89, lon) > alt).toBe(true);
        continue;
      }
      if (col.south > -90) expect(elevation(date, col.south, lon)).toBeCloseTo(alt, 6);
      if (col.north < 90) expect(elevation(date, col.north, lon)).toBeCloseTo(alt, 6);
      expect(elevation(date, (col.south + col.north) / 2, lon)).toBeLessThan(alt);
    }
  });

  it('leaves the north pole lit and the south pole dark at the June solstice', () => {
    const sub = subsolarPoint(JUNE);
    for (let lon = -180; lon < 180; lon += 10) {
      const col = darkColumn(sub, 0, lon)!;
      expect(col.south).toBe(-90);
      expect(col.north).toBeLessThan(90);
    }
  });

  it('has no astronomical night on midsummer meridians near the north pole', () => {
    const sub = subsolarPoint(JUNE);
    const col = darkColumn(sub, -18, sub.lon + 180)!;
    // Above about 48.5° N the sun stays within 18° of the horizon all night
    expect(col.north).toBeCloseTo(90 - 23.44 - 18, 0);
  });
});

describe('darkRegion', () => {
  it('runs once around the globe from the west edge', () => {
    const runs = darkRegion(subsolarPoint(JUNE), 0, -30);
    const cols = runs.flat();
    expect(cols[0].lon).toBe(-30);
    expect(cols.at(-1)!.lon).toBe(330);
  });

  it('only covers meridians that reach astronomical night', () => {
    // At the equinox that region is a 72° cap around the point opposite the sun
    const sub = subsolarPoint(MARCH);
    const cols = darkRegion(sub, -18, sub.lon).flat();
    expect(cols.length).toBeGreaterThan(140);
    expect(cols.length).toBeLessThan(150);
    for (const c of cols) expect(Math.abs(wrapLongitude(c.lon - sub.lon - 180))).toBeLessThan(73);
  });
});

describe('regionPathData', () => {
  it('traces the north edge east, then the south edge back', () => {
    const d = regionPathData(
      [[{ lon: 0, south: -10, north: 20 }, { lon: 1, south: -5, north: 25 }]],
      (lon) => lon + 180,
      (lat) => 90 - lat,
    );
    expect(d).toBe('M180.0 70.0L181.0 65.0L181.0 95.0L180.0 100.0Z');
  });
});

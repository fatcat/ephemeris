import { describe, expect, it } from 'vitest';
import type { HomeContext } from '../home.js';
import { SKY_INFO, parseSkyConfig } from './skyConfig.js';

describe('parseSkyConfig', () => {
  it('fills defaults', () => {
    expect(parseSkyConfig({})).toEqual({
      orientation: 'north_up',
      paths: ['solstices', 'equinox', 'today'],
      hourMarkers: 'clock',
      panels: [],
    });
  });

  it('accepts panels and wraps azimuth 360 to 0', () => {
    const c = parseSkyConfig({ panels: [{ name: ' Roof ', tilt: 35, azimuth: 360 }], paths: ['today', 'today'] });
    expect(c.panels).toEqual([{ name: 'Roof', tilt: 35, azimuth: 0 }]);
    expect(c.paths).toEqual(['today']);
  });

  it.each([
    [{ orientation: 'south_up' }, '"orientation"'],
    [{ paths: 'today' }, '"paths" must be a list'],
    [{ paths: ['moon'] }, '"paths"'],
    [{ hour_markers: 'sidereal' }, '"hour_markers"'],
    [{ panels: {} }, '"panels" must be a list'],
    [{ panels: [1] }, 'Panel 1 must have'],
    [{ panels: [{ tilt: 30, azimuth: 180 }] }, 'Panel 1 needs a name'],
    [{ panels: [{ name: 'x'.repeat(21), tilt: 30, azimuth: 180 }] }, 'at most 20'],
    [{ panels: [{ name: 'A', tilt: 91, azimuth: 180 }] }, 'Panel 1 "tilt"'],
    [{ panels: [{ name: 'A', tilt: 30, azimuth: '180' }] }, 'Panel 1 "azimuth"'],
    [{ panels: Array(5).fill({ name: 'A', tilt: 1, azimuth: 1 }) }, 'at most 4'],
  ])('rejects %j', (raw, message) => {
    expect(() => parseSkyConfig(raw as Record<string, unknown>)).toThrow(message);
  });
});

describe('panel_alignment', () => {
  const oslo: HomeContext = { lat: 59.91, lon: 10.75, timeZone: 'Europe/Oslo', language: 'en', hour12: false, dark: false };
  const value = (iso: string, card: unknown) => SKY_INFO.panel_alignment.value({ instant: new Date(iso), home: oslo, card });

  it('says so when there are no panels', () => {
    expect(value('2026-06-21T11:00:00Z', parseSkyConfig({}))).toBe('No panels set');
  });

  it('favors the south roof at noon and the west roof in the evening', () => {
    const card = parseSkyConfig({
      panels: [
        { name: 'South', tilt: 35, azimuth: 180 },
        { name: 'West', tilt: 35, azimuth: 270 },
      ],
    });
    const noon = value('2026-06-21T11:17:00Z', card) as { rows: { percent: number }[] };
    const evening = value('2026-06-21T17:00:00Z', card) as { rows: { percent: number }[] };
    expect(noon.rows[0].percent).toBeGreaterThan(95);
    expect(noon.rows[0].percent).toBeGreaterThan(noon.rows[1].percent);
    expect(evening.rows[1].percent).toBeGreaterThan(evening.rows[0].percent);
    const night = value('2026-12-21T22:00:00Z', card) as { rows: { percent: number }[] };
    expect(night.rows.map((r) => r.percent)).toEqual([0, 0]);
  });
});

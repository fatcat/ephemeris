import { describe, expect, it } from 'vitest';
import type { HomeContext } from '../home.js';
import { DAYNIGHT_INFO, parseDayNightConfig } from './dayNightConfig.js';
import { peopleFromHass } from './people.js';

describe('parseDayNightConfig', () => {
  it('fills defaults', () => {
    expect(parseDayNightConfig({})).toEqual({
      view: 'map',
      layers: ['twilight', 'tropics', 'sun'],
      centerLongitude: 0,
      markers: [],
    });
  });

  it('takes the globe view', () => {
    expect(parseDayNightConfig({ view: 'globe' }).view).toBe('globe');
  });

  it('drops repeats', () => {
    const c = parseDayNightConfig({ layers: ['sun', 'sun'], markers: ['person.a', 'person.a'], center_longitude: -75 });
    expect(c).toEqual({ view: 'map', layers: ['sun'], centerLongitude: -75, markers: ['person.a'] });
  });

  it.each([
    [{ view: 'flat' }, '"view"'],
    [{ layers: 'sun' }, '"layers" must be a list'],
    [{ layers: ['clouds'] }, '"layers"'],
    [{ center_longitude: 200 }, '"center_longitude"'],
    [{ center_longitude: '0' }, '"center_longitude"'],
    [{ markers: 'person.a' }, '"markers" must be a list'],
    [{ markers: ['device_tracker.phone'] }, 'person entities'],
    [{ markers: ['person.<b>'] }, 'person entities'],
    [{ markers: Array.from({ length: 9 }, (_, i) => `person.p${i}`) }, 'at most 8'],
  ])('rejects %j', (raw, message) => {
    expect(() => parseDayNightConfig(raw)).toThrow(message);
  });
});

describe('peopleFromHass', () => {
  const hass = {
    states: {
      'person.alex': { attributes: { friendly_name: 'Alex', latitude: 35.7, longitude: 139.7 } },
      'person.kim': { attributes: { friendly_name: 'Kim' } },
      'person.lee': { attributes: { latitude: 95, longitude: 0 } },
      'person.jo': { attributes: { friendly_name: '  ', latitude: 1, longitude: 2 } },
      'person.long': { attributes: { friendly_name: 'A'.repeat(40), latitude: 0, longitude: 0 } },
    },
  };

  it('keeps people with a valid position, in config order', () => {
    const people = peopleFromHass(hass, ['person.jo', 'person.alex', 'person.kim', 'person.lee', 'person.none']);
    expect(people).toEqual([
      { id: 'person.jo', name: 'jo', lat: 1, lon: 2 },
      { id: 'person.alex', name: 'Alex', lat: 35.7, lon: 139.7 },
    ]);
  });

  it('shortens long names', () => {
    expect(peopleFromHass(hass, ['person.long'])[0].name).toHaveLength(20);
  });
});

describe('sun_overhead', () => {
  const home: HomeContext = { lat: 59.9, lon: 10.75, timeZone: 'Europe/Oslo', language: 'en', hour12: false, dark: false };

  it('names the subsolar point', () => {
    const value = DAYNIGHT_INFO.sun_overhead.value({ instant: new Date('2026-06-21T12:00:00Z'), home, card: null });
    expect(value).toMatch(/^23\.4° N, [0-9.]+° [EW]$/);
  });
});

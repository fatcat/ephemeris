import { describe, expect, it } from 'vitest';
import { homeFromHass, resolveHour12, sameHome } from './home.js';

const base = {
  config: { latitude: 59.91, longitude: 10.75, time_zone: 'Europe/Oslo' },
  locale: { language: 'en', time_format: '24', time_zone: 'server' },
  themes: { darkMode: true },
};

describe('homeFromHass', () => {
  it('reads location, zone and preferences', () => {
    expect(homeFromHass(base, 'America/Denver')).toEqual({
      lat: 59.91,
      lon: 10.75,
      timeZone: 'Europe/Oslo',
      language: 'en',
      hour12: false,
      dark: true,
    });
  });

  it('uses the browser zone only when the profile asks for local', () => {
    const local = { ...base, locale: { ...base.locale, time_zone: 'local' } };
    expect(homeFromHass(local, 'America/Denver')?.timeZone).toBe('America/Denver');
    expect(homeFromHass(local, '')?.timeZone).toBe('Europe/Oslo');
    expect(homeFromHass(local, 'Not/AZone')?.timeZone).toBe('Europe/Oslo');
  });

  it('returns null without a usable location', () => {
    expect(homeFromHass({})).toBeNull();
    expect(homeFromHass({ config: { latitude: 91, longitude: 0 } })).toBeNull();
    expect(homeFromHass({ config: { latitude: '59', longitude: 10 } })).toBeNull();
    expect(homeFromHass({ config: { latitude: NaN, longitude: 10 } })).toBeNull();
  });

  it('falls back on a bad zone or language', () => {
    const home = homeFromHass({ config: { latitude: 0, longitude: 0, time_zone: 'Mars/Olympus' }, locale: { language: '' } });
    expect(home?.timeZone).toBe('UTC');
    expect(home?.language).toBe('en');
    expect(home?.dark).toBe(false);
  });

  it('compares by value', () => {
    expect(sameHome(homeFromHass(base), homeFromHass(structuredClone(base)))).toBe(true);
    expect(sameHome(homeFromHass(base), null)).toBe(false);
  });
});

describe('resolveHour12', () => {
  it('matches HA for explicit and language choices', () => {
    expect(resolveHour12('12', 'de')).toBe(true);
    expect(resolveHour12('24', 'en')).toBe(false);
    expect(resolveHour12('language', 'en')).toBe(true);
    expect(resolveHour12('language', 'de')).toBe(false);
  });
});

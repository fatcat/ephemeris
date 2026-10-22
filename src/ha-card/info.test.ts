import { describe, expect, it } from 'vitest';
import type { HomeContext } from './home.js';
import { SHARED_INFO, nextSolstice, type SharedInfoId } from './info.js';

const at = (iso: string, home: HomeContext) => (id: SharedInfoId) =>
  SHARED_INFO[id].value({ instant: new Date(iso), home, card: null }) as string;

const oslo: HomeContext = { lat: 59.91, lon: 10.75, timeZone: 'Europe/Oslo', language: 'en', hour12: false, dark: false };
const tromso: HomeContext = { ...oslo, lat: 69.65, lon: 18.96 };
const quito: HomeContext = { ...oslo, lat: 0, lon: -78.5, timeZone: 'America/Guayaquil' };

describe('info boxes, known answers', () => {
  it('Oslo on the June solstice', () => {
    const v = at('2026-06-21T11:00:00Z', oslo);
    expect(v('noon_height')).toBe('53.5°');
    expect(v('sunrise')).toBe('03:53');
    expect(v('sunset')).toBe('22:43');
    expect(v('daylight')).toBe('18h 50m');
    expect(v('golden_hour')).toBe('21:24');
  });

  it('Oslo in winter has short days that are getting shorter', () => {
    const v = at('2026-11-15T11:00:00Z', oslo);
    expect(v('daylight_change')).toMatch(/^−[3-5]m \d\ds$/);
    expect(v('status')).toBe('Day (morning)');
  });

  it('the equator at the March equinox has the sun near overhead at noon', () => {
    const v = at('2026-03-20T17:00:00Z', quito);
    expect(parseFloat(v('noon_height'))).toBeGreaterThan(89.5);
  });

  it('Tromsø: midnight sun in June, polar night in December', () => {
    const june = at('2026-06-21T11:00:00Z', tromso);
    expect(june('sunrise')).toBe('Up all day');
    expect(june('daylight')).toBe('24h 00m');
    expect(june('civil_dusk')).toBe('No dark');
    const dec = at('2026-12-21T11:00:00Z', tromso);
    expect(dec('sunrise')).toBe('No sunrise');
    expect(dec('noon_height')).toBe('Below horizon');
    expect(dec('daylight')).toBe('0h 00m');
  });

  it('finds the next solstice', () => {
    expect(nextSolstice(new Date('2026-10-20T00:00:00Z'), 'UTC').toISOString().slice(0, 10)).toBe('2026-12-21');
    expect(nextSolstice(new Date('2026-12-25T00:00:00Z'), 'UTC').toISOString().slice(0, 10)).toBe('2027-06-21');
  });
});

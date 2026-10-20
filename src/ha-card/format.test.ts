import { describe, expect, it } from 'vitest';
import { formatChange, formatDuration, formatMinutes, formatTime, localNoon, zonedParts, zonedToUtc } from './format.js';

const oslo = { timeZone: 'Europe/Oslo', hour12: false, language: 'en' };

describe('zonedToUtc', () => {
  it('converts an ordinary wall time', () => {
    expect(zonedToUtc(2026, 6, 21, 12 * 60, 'Europe/Oslo').toISOString()).toBe('2026-06-21T10:00:00.000Z');
    expect(zonedToUtc(2026, 1, 15, 12 * 60, 'Europe/Oslo').toISOString()).toBe('2026-01-15T11:00:00.000Z');
    expect(zonedToUtc(2026, 6, 21, 0, 'America/Denver').toISOString()).toBe('2026-06-21T06:00:00.000Z');
  });

  it('lands after a spring-forward gap', () => {
    // 02:30 doesn't exist in Oslo on 2026-03-29; 03:30 CEST does
    expect(zonedToUtc(2026, 3, 29, 2 * 60 + 30, 'Europe/Oslo').toISOString()).toBe('2026-03-29T01:30:00.000Z');
  });

  it('picks the earlier instant in a fall-back overlap', () => {
    // 02:30 happens twice in Oslo on 2026-10-25: first in CEST
    expect(zonedToUtc(2026, 10, 25, 2 * 60 + 30, 'Europe/Oslo').toISOString()).toBe('2026-10-25T00:30:00.000Z');
  });

  it('round-trips through zonedParts', () => {
    for (const tz of ['Australia/Sydney', 'Asia/Kolkata', 'Pacific/Kiritimati', 'UTC']) {
      const t = zonedToUtc(2026, 12, 21, 17 * 60 + 45, tz);
      expect(zonedParts(t, tz)).toEqual({ year: 2026, month: 12, day: 21, minutes: 17 * 60 + 45 });
    }
  });
});

describe('localNoon', () => {
  it('stays on the local calendar day', () => {
    // 23:30 UTC on Oct 20 is already Oct 21 in Sydney
    const noon = localNoon(new Date('2026-10-20T23:30:00Z'), 'Australia/Sydney');
    expect(zonedParts(noon, 'Australia/Sydney')).toEqual({ year: 2026, month: 10, day: 21, minutes: 720 });
  });
});

describe('formatting', () => {
  it('follows the 12/24 hour choice', () => {
    const t = new Date('2026-06-21T20:43:00Z');
    expect(formatTime(t, oslo)).toBe('22:43');
    expect(formatTime(t, { ...oslo, hour12: true })).toBe('10:43 PM');
  });

  it('formats minutes as a clock time without shifting zones', () => {
    expect(formatMinutes(0, oslo)).toBe('00:00');
    expect(formatMinutes(13 * 60 + 5, { ...oslo, hour12: true })).toBe('1:05 PM');
  });

  it('formats durations and changes', () => {
    expect(formatDuration(18.84)).toBe('18h 50m');
    expect(formatDuration(0)).toBe('0h 00m');
    expect(formatChange(133)).toBe('+2m 13s');
    expect(formatChange(-48)).toBe('−0m 48s');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { zonedParts } from './format.js';
import { TimeSelection } from './timeSelection.svelte.js';

const TZ = 'Europe/Oslo';
const now = new Date('2026-10-20T11:07:00Z');

describe('TimeSelection', () => {
  let sel: TimeSelection;
  beforeEach(() => {
    vi.useFakeTimers();
    sel = new TimeSelection();
  });
  afterEach(() => {
    sel.dispose();
    vi.useRealTimers();
  });

  it('is live until something is picked', () => {
    expect(sel.live).toBe(true);
    expect(sel.instant(now, TZ)).toBe(now);
    expect(sel.minutes(now, TZ)).toBe(13 * 60 + 7);
  });

  it('keeps the clock time when picking a day', () => {
    sel.pickDay('june', now, TZ);
    const shown = zonedParts(sel.instant(now, TZ), TZ);
    expect(shown).toEqual({ year: 2026, month: 6, day: 21, minutes: 13 * 60 + 7 });
  });

  it('snaps back to live after the idle time', () => {
    sel.setResetAfter(30);
    sel.setMinutes(600);
    vi.advanceTimersByTime(29_000);
    expect(sel.live).toBe(false);
    vi.advanceTimersByTime(2_000);
    expect(sel.live).toBe(true);
  });

  it('never snaps back with reset_after 0', () => {
    sel.setResetAfter(0);
    sel.setMinutes(600);
    vi.advanceTimersByTime(3_600_000);
    expect(sel.live).toBe(false);
  });

  it('does not snap back while playing, and wraps past midnight', () => {
    sel.setResetAfter(5);
    sel.setMinutes(1430);
    sel.togglePlay(now, TZ);
    vi.advanceTimersByTime(10_000);
    expect(sel.live).toBe(false);
    expect(sel.playing).toBe(true);
    expect(sel.picked?.minutes).toBeLessThan(1430);
    sel.togglePlay(now, TZ);
    vi.advanceTimersByTime(6_000);
    expect(sel.live).toBe(true);
  });

  it('pauses live time first, then plays the day', () => {
    expect(sel.moving).toBe(true);
    sel.togglePlay(now, TZ);
    expect(sel.live).toBe(false);
    expect(sel.playing).toBe(false);
    expect(sel.moving).toBe(false);
    const paused = sel.picked?.minutes;
    vi.advanceTimersByTime(1_000);
    expect(sel.picked?.minutes).toBe(paused);
    sel.togglePlay(now, TZ);
    expect(sel.playing).toBe(true);
    expect(sel.moving).toBe(true);
  });
});

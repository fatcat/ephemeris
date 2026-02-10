/**
 * Time store — centralized simulation time state.
 *
 * Manages three playback modes:
 * - realtime: tracks the system clock
 * - smooth: time advances at playbackSpeed × real time
 * - snap: time advances by snapInterval days per tick (~1s)
 */

import { writable, derived, get } from 'svelte/store';
import { sunDirectionVector, formatDateUTC } from '../astronomy/solar.js';
import { Vector3 } from 'three';

export type PlaybackMode = 'realtime' | 'smooth' | 'snap';

export const SMOOTH_SPEEDS = [-5000, -1000, -500, -250, -1, 1, 250, 500, 1000, 5000] as const;
export const SNAP_INTERVALS = [-7, -4, -2, -1, 1, 2, 4, 7] as const;

/** ±200 years from now */
const BOUND_YEARS = 200;
function timeBounds(): { min: number; max: number } {
  const now = Date.now();
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  return {
    min: now - BOUND_YEARS * msPerYear,
    max: now + BOUND_YEARS * msPerYear,
  };
}

function clampTime(ms: number): number {
  const { min, max } = timeBounds();
  return Math.max(min, Math.min(max, ms));
}

/** The current simulation time (Date object, UTC) */
export const currentTime = writable<Date>(new Date());

/** Playback mode */
export const playbackMode = writable<PlaybackMode>('realtime');

/** Speed multiplier for smooth mode */
export const playbackSpeed = writable<number>(1);

/** Day interval for snap mode */
export const snapInterval = writable<number>(1);

/** Whether time is advancing */
export const isPlaying = writable<boolean>(true);

/** Derived: sun direction vector for shader uniform */
export const sunDirection = derived(currentTime, ($time) =>
  sunDirectionVector($time),
);

/** Derived: formatted date/time string */
export const formattedTime = derived(currentTime, ($time) =>
  formatDateUTC($time),
);

/** Cached sun direction to avoid re-deriving in the animation loop */
let cachedSunDir = new Vector3(0, 0, 1);
sunDirection.subscribe((dir) => {
  cachedSunDir = dir;
});

/** Get the current sun direction without subscribing */
export function getSunDirection(): Vector3 {
  return cachedSunDir;
}

/**
 * Advance time for one animation frame.
 * Called from the animation loop in App.svelte.
 *
 * @param deltaSec - elapsed wall-clock seconds since last frame
 */
export function tick(deltaSec: number): void {
  const mode = get(playbackMode);
  const playing = get(isPlaying);

  if (mode === 'realtime') {
    currentTime.set(new Date());
    return;
  }

  if (!playing) return;

  if (mode === 'smooth') {
    const speed = get(playbackSpeed);
    const deltaMs = deltaSec * speed * 1000;
    currentTime.update((t) => {
      const unclamped = t.getTime() + deltaMs;
      const { min, max } = timeBounds();
      if (unclamped <= min || unclamped >= max) {
        isPlaying.set(false);
        return new Date(Math.max(min, Math.min(max, unclamped)));
      }
      return new Date(unclamped);
    });
  }
}

// --- Snap mode timer ---
let snapTimerId: ReturnType<typeof setInterval> | null = null;

function startSnapTimer(): void {
  stopSnapTimer();
  snapTimerId = setInterval(() => {
    const playing = get(isPlaying);
    if (!playing) return;

    const days = get(snapInterval);
    const deltaMs = days * 24 * 60 * 60 * 1000;
    currentTime.update((t) => {
      const next = clampTime(t.getTime() + deltaMs);
      if (next !== t.getTime() + deltaMs) {
        isPlaying.set(false);
      }
      return new Date(next);
    });
  }, 1000);
}

function stopSnapTimer(): void {
  if (snapTimerId !== null) {
    clearInterval(snapTimerId);
    snapTimerId = null;
  }
}

// React to mode and playing state changes for snap timer
let currentMode: PlaybackMode = 'realtime';
let currentPlaying = true;

playbackMode.subscribe((mode) => {
  currentMode = mode;
  if (mode === 'snap' && currentPlaying) {
    startSnapTimer();
  } else {
    stopSnapTimer();
  }
});

isPlaying.subscribe((playing) => {
  currentPlaying = playing;
  if (currentMode === 'snap' && playing) {
    startSnapTimer();
  } else if (currentMode === 'snap' && !playing) {
    stopSnapTimer();
  }
});

/** Set time to a specific date (pauses playback, switches to smooth mode paused) */
export function setTime(date: Date): void {
  const ms = clampTime(date.getTime());
  currentTime.set(new Date(ms));
  playbackMode.set('smooth');
  playbackSpeed.set(1);
  isPlaying.set(false);
}

/** Reset to real-time mode synced to system clock */
export function resetToRealtime(): void {
  playbackMode.set('realtime');
  isPlaying.set(true);
  currentTime.set(new Date());
}

/** Sync to system clock (only used in realtime mode) */
export function syncToSystemClock(): void {
  currentTime.set(new Date());
}

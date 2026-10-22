/**
 * Which moment a card shows: live "now", or a day and clock time the user picked.
 *
 * After `resetAfter` seconds without interaction (and not playing), the card
 * snaps back to live. Playing steps the clock through the day.
 *
 * The play button pauses whenever time is moving: live counts as moving, so the
 * first press freezes the clock and the next one plays through the day.
 */

import { findEquinoxOrSolstice } from '../lib/astronomy/solar.js';
import { formatDayMonth, zonedParts, zonedToUtc, type FormatContext } from './format.js';

/** Minutes the clock moves per play step, and how often it steps */
const PLAY_STEP_MIN = 10;
const PLAY_INTERVAL_MS = 90;
const DAY_MIN = 1440;

export type DayId = 'today' | 'june' | 'march' | 'december';

export interface DayOption {
  id: DayId;
  label: string;
}

interface Picked {
  day: DayId;
  minutes: number;
}

/** Solar longitude of each special day, for `findEquinoxOrSolstice` */
const SOLAR_LONGITUDE: Record<Exclude<DayId, 'today'>, number> = { june: 90, march: 0, december: 270 };

export class TimeSelection {
  /** Null while live */
  picked = $state<Picked | null>(null);
  playing = $state(false);

  #resetAfterMs = 0;
  #resetTimer: ReturnType<typeof setTimeout> | undefined;
  #playTimer: ReturnType<typeof setInterval> | undefined;

  setResetAfter(seconds: number): void {
    this.#resetAfterMs = seconds * 1000;
    this.#armReset();
  }

  get live(): boolean {
    return this.picked === null;
  }

  /** True while the clock runs, live or playing */
  get moving(): boolean {
    return this.live || this.playing;
  }

  /** The instant shown, given the current time and the home time zone */
  instant(now: Date, timeZone: string): Date {
    if (!this.picked) return now;
    const { year, month, day } = this.dayParts(this.picked.day, now, timeZone);
    return zonedToUtc(year, month, day, this.picked.minutes, timeZone);
  }

  /** Minutes since local midnight of the instant shown */
  minutes(now: Date, timeZone: string): number {
    return this.picked ? this.picked.minutes : zonedParts(now, timeZone).minutes;
  }

  day(): DayId {
    return this.picked?.day ?? 'today';
  }

  dayParts(day: DayId, now: Date, timeZone: string) {
    if (day === 'today') return zonedParts(now, timeZone);
    const { year } = zonedParts(now, timeZone);
    return zonedParts(findEquinoxOrSolstice(year, SOLAR_LONGITUDE[day]), timeZone);
  }

  dayOptions(now: Date, ctx: FormatContext): DayOption[] {
    const { year } = zonedParts(now, ctx.timeZone);
    const solstice = (lon: number) => formatDayMonth(findEquinoxOrSolstice(year, lon), ctx);
    return [
      { id: 'today', label: 'Today' },
      { id: 'june', label: solstice(SOLAR_LONGITUDE.june) },
      { id: 'march', label: 'Equinox' },
      { id: 'december', label: solstice(SOLAR_LONGITUDE.december) },
    ];
  }

  pickDay(day: DayId, now: Date, timeZone: string): void {
    this.picked = { day, minutes: this.minutes(now, timeZone) };
    this.#armReset();
  }

  /** Move the clock on the day already shown */
  setMinutes(minutes: number): void {
    this.stop();
    this.picked = { day: this.day(), minutes };
    this.#armReset();
  }

  togglePlay(now: Date, timeZone: string): void {
    if (this.moving) {
      this.stop();
      this.picked ??= { day: 'today', minutes: this.minutes(now, timeZone) };
      this.#armReset();
      return;
    }
    this.playing = true;
    clearTimeout(this.#resetTimer);
    this.#playTimer = setInterval(() => {
      if (this.picked) {
        this.picked = { ...this.picked, minutes: (this.picked.minutes + PLAY_STEP_MIN) % DAY_MIN };
      }
    }, PLAY_INTERVAL_MS);
  }

  stop(): void {
    this.playing = false;
    clearInterval(this.#playTimer);
    this.#playTimer = undefined;
  }

  goLive(): void {
    this.stop();
    clearTimeout(this.#resetTimer);
    this.picked = null;
  }

  dispose(): void {
    this.stop();
    clearTimeout(this.#resetTimer);
  }

  #armReset(): void {
    clearTimeout(this.#resetTimer);
    if (!this.picked || this.playing || this.#resetAfterMs <= 0) return;
    this.#resetTimer = setTimeout(() => this.goLive(), this.#resetAfterMs);
  }
}

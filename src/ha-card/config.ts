/**
 * Config options shared by every Ephemeris card, and their validation.
 *
 * HA calls `setConfig` with whatever the user typed in YAML, so every field is
 * checked here. Errors are thrown with a message HA shows in place of the card.
 */

import { MAX_INFO } from './info.js';

export const CONTROLS = ['none', 'compact', 'full'] as const;
export type Controls = (typeof CONTROLS)[number];

export const MAX_RESET_AFTER = 3600;
export const MAX_TITLE_LENGTH = 60;

export interface SharedConfig {
  /** A custom title, `false` to hide the header, or undefined for the card's default */
  title: string | false | undefined;
  controls: Controls;
  /** Seconds idle before going back to now; 0 = never */
  resetAfter: number;
  info: string[];
}

export interface SharedDefaults {
  info: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseSharedConfig(
  raw: unknown,
  infoIds: readonly string[],
  defaults: SharedDefaults,
): SharedConfig {
  if (!isRecord(raw)) throw new Error('Card config must be an object.');

  const { title, controls = 'full', reset_after = 60, info = defaults.info } = raw;

  if (title !== undefined && title !== false && typeof title !== 'string') {
    throw new Error('"title" must be text, or false to hide the header.');
  }
  if (typeof title === 'string' && title.length > MAX_TITLE_LENGTH) {
    throw new Error(`"title" can be at most ${MAX_TITLE_LENGTH} characters.`);
  }

  if (!CONTROLS.includes(controls as Controls)) {
    throw new Error(`"controls" must be one of: ${CONTROLS.join(', ')}.`);
  }

  if (
    typeof reset_after !== 'number' ||
    !Number.isInteger(reset_after) ||
    reset_after < 0 ||
    reset_after > MAX_RESET_AFTER
  ) {
    throw new Error(`"reset_after" must be a whole number of seconds from 0 to ${MAX_RESET_AFTER}.`);
  }

  if (!Array.isArray(info)) throw new Error('"info" must be a list of info box ids.');
  if (info.length > MAX_INFO) throw new Error(`"info" can list at most ${MAX_INFO} boxes.`);
  const seen = new Set<string>();
  for (const id of info) {
    if (typeof id !== 'string' || !infoIds.includes(id)) {
      throw new Error(`Unknown info box "${String(id)}". Known ids: ${infoIds.join(', ')}.`);
    }
    if (seen.has(id)) throw new Error(`Info box "${id}" is listed twice.`);
    seen.add(id);
  }

  return {
    title: typeof title === 'string' && title.trim() === '' ? undefined : title,
    controls: controls as Controls,
    resetAfter: reset_after,
    info: [...info] as string[],
  };
}

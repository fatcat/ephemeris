/**
 * Sun path colors, keyed by how the path relates to the observer's seasons.
 * Shared by the app's sky dome and the Home Assistant sky card.
 */

import type { PathRole } from './astronomy/sunPath.js';

export type PathColorKey = PathRole | 'today';

/** For dark or mid-tone backgrounds (the app's dome, dark dashboards) */
export const PATH_COLORS: Record<PathColorKey, number> = {
  summer: 0xe08a3c, // warm orange: the solstice with the higher sun
  winter: 0x5b8fd6, // cool blue: the solstice with the lower sun
  equinox: 0x9aa3ad, // neutral gray
  today: 0xf2c94c, // sun yellow
};

/** Darker versions that keep contrast on white */
export const PATH_COLORS_ON_LIGHT: Record<PathColorKey, number> = {
  summer: 0xc96a1b,
  winter: 0x2f6fc0,
  equinox: 0x7a848e,
  today: 0xb98a00,
};

export function cssHex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

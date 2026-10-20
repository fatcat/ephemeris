/** Fake `hass` objects and theme variables for the card harness and tests */

import type { HassLike } from '../home.js';

export const HOMES = {
  oslo: { latitude: 59.91, longitude: 10.75, time_zone: 'Europe/Oslo' },
  sydney: { latitude: -33.87, longitude: 151.21, time_zone: 'Australia/Sydney' },
  denver: { latitude: 39.74, longitude: -104.99, time_zone: 'America/Denver' },
  tromso: { latitude: 69.65, longitude: 18.96, time_zone: 'Europe/Oslo' },
  equator: { latitude: 0.0, longitude: -78.5, time_zone: 'America/Guayaquil' },
  mcmurdo: { latitude: -77.85, longitude: 166.67, time_zone: 'Antarctica/McMurdo' },
} as const;

/** A few of HA's default theme variables, enough to see light and dark */
export const THEMES: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    '--primary-background-color': '#fafafa',
    '--ha-card-background': '#ffffff',
    '--secondary-background-color': '#e5e5e5',
    '--primary-text-color': '#212121',
    '--secondary-text-color': '#727272',
    '--primary-color': '#03a9f4',
    '--text-primary-color': '#ffffff',
    '--divider-color': 'rgba(0, 0, 0, 0.12)',
  },
  dark: {
    '--primary-background-color': '#111111',
    '--ha-card-background': '#1c1c1c',
    '--secondary-background-color': '#282828',
    '--primary-text-color': '#e1e1e1',
    '--secondary-text-color': '#9b9b9b',
    '--primary-color': '#03a9f4',
    '--text-primary-color': '#ffffff',
    '--divider-color': 'rgba(225, 225, 225, 0.12)',
  },
};

export interface MockOptions {
  home: keyof typeof HOMES;
  theme: keyof typeof THEMES;
  timeFormat: string;
  zonePref: string;
  language: string;
}

export function mockHass(o: MockOptions): HassLike {
  return {
    config: { ...HOMES[o.home] },
    locale: { language: o.language, time_format: o.timeFormat, time_zone: o.zonePref },
    themes: { darkMode: o.theme === 'dark' },
  };
}

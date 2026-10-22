/**
 * What the map and the globe share: how dark each night layer is, the key below
 * them, and the screen reader description.
 */

import { TWILIGHT_LIMITS, type GeoPoint } from '../../lib/astronomy/daylightRegions.js';
import { SUNRISE_ALTITUDE_DEG } from '../../lib/astronomy/solar.js';
import type { LegendItem } from '../components/Legend.svelte';
import { formatLatitude, formatLongitude } from '../format.js';
import type { HomeContext } from '../home.js';
import type { MapLayer } from './dayNightConfig.js';

// Each twilight band darkens what is under it, so night is all four layers stacked
const BAND_OPACITY = 0.3;
const TWILIGHT_OPACITY = 0.16;
const PLAIN_NIGHT_OPACITY = 0.62;

export interface NightLayer {
  /** Dark where the sun is below this altitude */
  alt: number;
  opacity: number;
}

export function nightLayers(twilight: boolean): NightLayer[] {
  return twilight
    ? TWILIGHT_LIMITS.map((alt, i) => ({ alt, opacity: i === 0 ? BAND_OPACITY : TWILIGHT_OPACITY }))
    : [{ alt: SUNRISE_ALTITUDE_DEG, opacity: PLAIN_NIGHT_OPACITY }];
}

/** How much night color covers a spot: the layers below `count` stacked */
export function stackedShade(layers: NightLayer[], count: number): number {
  return 1 - layers.slice(0, count).reduce((clear, l) => clear * (1 - l.opacity), 1);
}

const mix = (amount: number) =>
  `color-mix(in srgb, var(--map-night) ${Math.round(amount * 100)}%, var(--map-land))`;

export function nightLegend(layers: MapLayer[]): LegendItem[] {
  const twilight = layers.includes('twilight');
  const night = nightLayers(twilight);
  return [
    ...(layers.includes('sun')
      ? [{ name: 'Sun overhead', color: 'var(--ephemeris-sun-color)', swatch: 'dot' as const }]
      : []),
    { name: 'Day', color: 'var(--map-land)', swatch: 'box' },
    // The key shows twilight as the first two layers, about midway through the bands
    ...(twilight ? [{ name: 'Twilight', color: mix(stackedShade(night, 2)), swatch: 'box' as const }] : []),
    { name: 'Night', color: mix(stackedShade(night, night.length)), swatch: 'box' },
  ];
}

export function describeView(kind: 'World map' | 'Globe', sub: GeoPoint, names: string[], home: HomeContext): string {
  return (
    `${kind} of day and night. The sun is overhead at ${formatLatitude(sub.lat, home)}, ` +
    `${formatLongitude(sub.lon, home)}. Marked: ${names.join(', ')}.`
  );
}

export interface Place extends GeoPoint {
  id: string;
  name: string;
  home: boolean;
}

/** Home first, then the people being followed */
export function markedPlaces(home: HomeContext, people: { id: string; name: string; lat: number; lon: number }[]): Place[] {
  return [
    { id: 'home', name: 'Home', lat: home.lat, lon: home.lon, home: true },
    ...people.map((p) => ({ ...p, home: false })),
  ];
}

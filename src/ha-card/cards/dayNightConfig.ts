/**
 * Options only the day/night map card has, their validation, its editor fields
 * and the "Sun overhead" info box.
 */

import { subsolarPoint } from '../../lib/astronomy/daylightRegions.js';
import { inRange, oneOf } from '../config.js';
import { formatLatitude, formatLongitude } from '../format.js';
import type { InfoDef } from '../info.js';
import { MAX_MARKERS, PERSON_ID } from './people.js';

export const MAP_LAYERS = ['twilight', 'tropics', 'sun'] as const;
export type MapLayer = (typeof MAP_LAYERS)[number];

export interface DayNightConfig {
  layers: MapLayer[];
  /** Longitude in the middle of the map; the map wraps around */
  centerLongitude: number;
  /** `person` entity ids to show where they are */
  markers: string[];
}

export function parseDayNightConfig(raw: Record<string, unknown>): DayNightConfig {
  const { layers = [...MAP_LAYERS], center_longitude = 0, markers = [] } = raw;

  if (!Array.isArray(layers)) throw new Error(`"layers" must be a list of: ${MAP_LAYERS.join(', ')}.`);
  const layerList = layers.map((l) => oneOf(l, MAP_LAYERS, 'layers'));

  if (!Array.isArray(markers)) throw new Error('"markers" must be a list of person entities.');
  if (markers.length > MAX_MARKERS) throw new Error(`"markers" can list at most ${MAX_MARKERS} people.`);
  for (const id of markers) {
    if (typeof id !== 'string' || !PERSON_ID.test(id)) {
      throw new Error(`"markers" takes person entities such as person.alex, not "${String(id)}".`);
    }
  }

  return {
    layers: [...new Set(layerList)],
    centerLongitude: inRange(center_longitude, -180, 180, '"center_longitude"'),
    markers: [...new Set(markers as string[])],
  };
}

export const DAYNIGHT_INFO: Record<string, InfoDef> = {
  sun_overhead: {
    label: 'Sun overhead',
    value: ({ instant, home }) => {
      const sub = subsolarPoint(instant);
      return `${formatLatitude(sub.lat, home)}, ${formatLongitude(sub.lon, home)}`;
    },
  },
};

export const DAYNIGHT_SCHEMA = [
  {
    name: 'layers',
    selector: {
      select: {
        multiple: true,
        options: [
          { value: 'twilight', label: 'Twilight bands' },
          { value: 'tropics', label: 'Equator and tropics' },
          { value: 'sun', label: 'Sun overhead' },
        ],
      },
    },
  },
  {
    name: 'center_longitude',
    selector: { number: { min: -180, max: 180, step: 1, mode: 'box', unit_of_measurement: '°' } },
  },
  {
    name: 'markers',
    selector: { entity: { multiple: true, filter: { domain: 'person' } } },
  },
];

export const DAYNIGHT_LABELS: Record<string, string> = {
  layers: 'Map layers',
  center_longitude: 'Map center longitude',
  markers: `People (up to ${MAX_MARKERS})`,
};

export const DAYNIGHT_HELPERS: Record<string, string> = {
  center_longitude: '0 puts Greenwich in the middle. East is positive, so 150 centers on Australia.',
  markers: 'Shown where their phone last reported a GPS position. Home is always shown.',
};

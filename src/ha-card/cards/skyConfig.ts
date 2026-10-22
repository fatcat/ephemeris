/**
 * Options only the sky card has, their validation, its editor fields and the
 * panel alignment info box.
 */

import { directBeamFraction } from '../../lib/astronomy/polarChart.js';
import type { ChartOrientation } from '../../lib/astronomy/polarChart.js';
import { sunElevationAzimuth } from '../../lib/astronomy/solar.js';
import { inRange, oneOf } from '../config.js';
import type { InfoDef } from '../info.js';

export const ORIENTATIONS = ['north_up', 'facing_sun'] as const satisfies readonly ChartOrientation[];
export const SKY_PATHS = ['solstices', 'equinox', 'today'] as const;
export const HOUR_MARKERS = ['clock', 'solar', 'none'] as const;
export const MAX_PANELS = 4;
export const MAX_PANEL_NAME = 20;

export type SkyPath = (typeof SKY_PATHS)[number];
export type HourMarkers = (typeof HOUR_MARKERS)[number];

export interface Panel {
  name: string;
  /** Degrees from flat: 0 lying flat, 90 vertical */
  tilt: number;
  /** Compass direction the panel faces, degrees clockwise from north */
  azimuth: number;
}

export interface SkyConfig {
  orientation: ChartOrientation;
  paths: SkyPath[];
  hourMarkers: HourMarkers;
  panels: Panel[];
}

export function parseSkyConfig(raw: Record<string, unknown>): SkyConfig {
  const { orientation = 'north_up', paths = [...SKY_PATHS], hour_markers = 'clock', panels = [] } = raw;

  if (!Array.isArray(paths)) throw new Error(`"paths" must be a list of: ${SKY_PATHS.join(', ')}.`);
  const pathList = paths.map((p) => oneOf(p, SKY_PATHS, 'paths'));

  if (!Array.isArray(panels)) throw new Error('"panels" must be a list.');
  if (panels.length > MAX_PANELS) throw new Error(`"panels" can list at most ${MAX_PANELS} panels.`);
  const panelList = panels.map((p: unknown, i): Panel => {
    const where = `Panel ${i + 1}`;
    if (typeof p !== 'object' || p === null) throw new Error(`${where} must have name, tilt and azimuth.`);
    const { name, tilt, azimuth } = p as Record<string, unknown>;
    if (typeof name !== 'string' || !name.trim()) throw new Error(`${where} needs a name.`);
    if (name.length > MAX_PANEL_NAME) throw new Error(`${where}: name can be at most ${MAX_PANEL_NAME} characters.`);
    return {
      name: name.trim(),
      tilt: inRange(tilt, 0, 90, `${where} "tilt"`),
      azimuth: inRange(azimuth, 0, 360, `${where} "azimuth"`) % 360,
    };
  });

  return {
    orientation: oneOf(orientation, ORIENTATIONS, 'orientation'),
    paths: [...new Set(pathList)],
    hourMarkers: oneOf(hour_markers, HOUR_MARKERS, 'hour_markers'),
    panels: panelList,
  };
}

export const SKY_INFO: Record<string, InfoDef> = {
  panel_alignment: {
    label: 'Sun on panels',
    value: ({ instant, home, card }) => {
      const { panels } = card as SkyConfig;
      if (!panels.length) return 'No panels set';
      const sun = sunElevationAzimuth(instant, home.lat, home.lon);
      return {
        rows: panels.map((p) => ({
          name: p.name,
          percent: Math.round(directBeamFraction(sun, p.tilt, p.azimuth) * 100),
        })),
      };
    },
  },
};

export const SKY_SCHEMA = [
  {
    name: 'orientation',
    selector: {
      select: {
        mode: 'dropdown',
        options: [
          { value: 'north_up', label: 'North up (standard sun-path chart)' },
          { value: 'facing_sun', label: 'Facing the sun' },
        ],
      },
    },
  },
  {
    name: 'paths',
    selector: {
      select: {
        multiple: true,
        options: [
          { value: 'solstices', label: 'Solstices' },
          { value: 'equinox', label: 'Equinox' },
          { value: 'today', label: 'Selected day' },
        ],
      },
    },
  },
  {
    name: 'hour_markers',
    selector: {
      select: {
        mode: 'dropdown',
        options: [
          { value: 'clock', label: 'Clock hours' },
          { value: 'solar', label: 'Solar hours (noon = sun highest)' },
          { value: 'none', label: 'None' },
        ],
      },
    },
  },
  {
    name: 'panels',
    selector: {
      object: {
        multiple: true,
        label_field: 'name',
        fields: {
          name: { label: 'Name', required: true, selector: { text: {} } },
          tilt: {
            label: 'Tilt (0 flat, 90 vertical)',
            required: true,
            selector: { number: { min: 0, max: 90, step: 1, mode: 'box', unit_of_measurement: '°' } },
          },
          azimuth: {
            label: 'Facing (90 E, 180 S, 270 W)',
            required: true,
            selector: { number: { min: 0, max: 359, step: 1, mode: 'box', unit_of_measurement: '°' } },
          },
        },
      },
    },
  },
];

export const SKY_LABELS: Record<string, string> = {
  orientation: 'Orientation',
  paths: 'Paths',
  hour_markers: 'Hour markers',
  panels: `Solar panels (up to ${MAX_PANELS})`,
};

export const SKY_HELPERS: Record<string, string> = {
  panels: 'Each panel shows on the chart where it faces. Add "Sun on panels" to the info boxes to compare them.',
};

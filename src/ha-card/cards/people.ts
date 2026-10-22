/**
 * People shown on the day/night map, read from HA `person` entities.
 *
 * A person entity carries its last GPS fix as `latitude` and `longitude`
 * attributes when a tracker with GPS feeds it. People without one are skipped.
 */

import type { HassLike } from '../home.js';

export const MAX_MARKERS = 8;
export const MAX_MARKER_NAME = 20;
export const PERSON_ID = /^person\.[a-z0-9_]+$/;

export interface PersonMarker {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

function isCoordinate(v: unknown, limit: number): v is number {
  return typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= limit;
}

export function peopleFromHass(hass: HassLike, ids: readonly string[]): PersonMarker[] {
  const out: PersonMarker[] = [];
  for (const id of ids) {
    const attrs = hass.states?.[id]?.attributes;
    if (!attrs || !isCoordinate(attrs.latitude, 90) || !isCoordinate(attrs.longitude, 180)) continue;
    const friendly = typeof attrs.friendly_name === 'string' ? attrs.friendly_name.trim() : '';
    out.push({
      id,
      name: (friendly || id.slice('person.'.length)).slice(0, MAX_MARKER_NAME),
      lat: attrs.latitude,
      lon: attrs.longitude,
    });
  }
  return out;
}

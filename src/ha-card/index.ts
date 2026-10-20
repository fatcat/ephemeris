/**
 * Entry point for the Home Assistant card bundle (`ephemeris-cards.js`).
 * Registers every Ephemeris card; HA loads this file as a JavaScript module resource.
 */

import { defineCard } from './defineCard.js';
import SkyCard from './cards/SkyCard.svelte';
import DayNightCard from './cards/DayNightCard.svelte';
import { SKY_HELPERS, SKY_INFO, SKY_LABELS, SKY_SCHEMA, parseSkyConfig } from './cards/skyConfig.js';

defineCard({
  type: 'ephemeris-sky-card',
  name: 'Ephemeris Sky Dome',
  description: "The sun's path across your sky today, at the solstices and the equinox.",
  defaultTitle: 'Sky Dome',
  defaultInfo: ['elevation', 'azimuth', 'noon_height', 'sunrise', 'sunset', 'daylight'],
  component: SkyCard,
  extraInfo: SKY_INFO,
  parseCard: parseSkyConfig,
  extraSchema: SKY_SCHEMA,
  extraLabels: SKY_LABELS,
  extraHelpers: SKY_HELPERS,
  cardSize: 12,
  gridOptions: { columns: 6, min_columns: 4 },
});

defineCard({
  type: 'ephemeris-daynight-card',
  name: 'Ephemeris Day and Night',
  description: 'A world map showing where it is day, twilight and night right now.',
  defaultTitle: 'Day and Night',
  defaultInfo: ['status', 'sunrise', 'sunset', 'daylight', 'daylight_change', 'next_solstice'],
  component: DayNightCard,
  cardSize: 9,
  gridOptions: { columns: 12, min_columns: 6 },
});

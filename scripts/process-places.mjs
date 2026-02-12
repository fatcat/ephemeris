#!/usr/bin/env node

/**
 * Downloads Natural Earth 10m Populated Places and generates a compact
 * JSON file for the place picker search feature.
 *
 * Output format: array of [name, country, lat, lon] tuples,
 * pre-sorted by population descending (largest cities first).
 *
 * Usage: node scripts/process-places.mjs
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'src', 'assets', 'geo', 'places.json');

const SOURCE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson';

async function main() {
  console.log('Downloading Natural Earth populated places...');
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

  const geojson = await res.json();
  console.log(`Received ${geojson.features.length} features`);

  // Extract fields and sort by population descending
  const places = geojson.features
    .map((f) => ({
      name: f.properties.name || f.properties.nameascii || '',
      country: f.properties.adm0name || '',
      lat: Math.round((f.properties.latitude ?? f.geometry.coordinates[1]) * 100) / 100,
      lon: Math.round((f.properties.longitude ?? f.geometry.coordinates[0]) * 100) / 100,
      pop: f.properties.pop_max || 0,
    }))
    .filter((p) => p.name.length > 0)
    .sort((a, b) => b.pop - a.pop);

  // Convert to compact tuple format: [name, country, lat, lon]
  const tuples = places.map((p) => [p.name, p.country, p.lat, p.lon]);

  writeFileSync(OUTPUT_PATH, JSON.stringify(tuples));

  const sizeKB = (Buffer.byteLength(JSON.stringify(tuples)) / 1024).toFixed(0);
  console.log(`Wrote ${tuples.length} places to ${OUTPUT_PATH} (${sizeKB} KB)`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

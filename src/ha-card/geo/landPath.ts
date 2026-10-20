/**
 * Turns Natural Earth land polygons (GeoJSON) into one compact SVG path, in a
 * 360 × 180 box with x = longitude + 180 and y = 90 − latitude.
 *
 * Runs at build time (see vite.card.config.ts). Points round to 0.1° and are
 * written as relative moves, which keeps the path about a quarter of the JSON.
 */

type Ring = [number, number][];

interface LandGeoJson {
  features: { geometry: { type: string; coordinates: unknown } }[];
}

/** Tenths of a degree as short text: 12 → "1.2", -5 → "-.5" */
function tenths(n: number): string {
  const s = (n / 10).toString();
  return s.replace(/^(-?)0\./, '$1.');
}

function ringPath(ring: Ring): string {
  const pts = ring.map(([lon, lat]) => [Math.round((lon + 180) * 10), Math.round((90 - lat) * 10)]);
  let [px, py] = pts[0];
  let d = `M${tenths(px)} ${tenths(py)}l`;
  let first = true;
  for (const [x, y] of pts.slice(1)) {
    if (x === px && y === py) continue;
    const dy = tenths(y - py);
    // A minus sign separates numbers on its own
    d += `${first ? '' : x - px < 0 ? '' : ' '}${tenths(x - px)}${dy.startsWith('-') ? '' : ' '}${dy}`;
    first = false;
    px = x;
    py = y;
  }
  return `${d}z`;
}

export function landPathData(geo: LandGeoJson): string {
  const rings: Ring[] = [];
  for (const { geometry } of geo.features) {
    if (geometry.type === 'Polygon') rings.push(...(geometry.coordinates as Ring[]));
    else if (geometry.type === 'MultiPolygon') rings.push(...(geometry.coordinates as Ring[][]).flat());
  }
  return rings.map(ringPath).join('');
}

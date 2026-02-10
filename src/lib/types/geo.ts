/** Minimal GeoJSON type definitions for Natural Earth data parsing. */

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties: Record<string, unknown>;
}

export type GeoJSONGeometry =
  | { type: 'LineString'; coordinates: [number, number][] }
  | { type: 'MultiLineString'; coordinates: [number, number][][] }
  | { type: 'Polygon'; coordinates: [number, number][][] }
  | { type: 'MultiPolygon'; coordinates: [number, number][][][] };

export interface GeoLabel {
  name: string;
  lat: number;
  lon: number;
  type: 'continent' | 'ocean' | 'sea';
}

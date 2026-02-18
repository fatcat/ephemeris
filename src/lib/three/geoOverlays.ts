/**
 * Geographic overlay line geometry for coastlines, rivers, and lakes.
 *
 * Converts GeoJSON data to Three.js LineSegments with a custom shader
 * that dims lines on the night side (day/night awareness).
 */

import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineSegments,
  ShaderMaterial,
  Vector3,
} from 'three';
import { geoToGlobePosition, geoToProjectionPosition } from '../utils/geo.js';
import type { GeoJSONFeatureCollection, GeoJSONGeometry } from '../types/geo.js';
import coastlineData from '../../assets/geo/coastlines.json';
import riverData from '../../assets/geo/rivers.json';
import lakeData from '../../assets/geo/lakes.json';

const GLOBE_OVERLAY_RADIUS = 1.003;

export interface OverlayGroup {
  group: Group;
  /** Update the sun direction uniform on all line materials in this group. */
  updateSunDirection: (sunDir: Vector3) => void;
}

// --- Day/night-aware line shaders ---

const globeLineVertexShader = /* glsl */ `
  varying vec3 vObjNormal;

  void main() {
    // On a unit sphere, normalized position IS the surface normal
    vObjNormal = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const globeLineFragmentShader = /* glsl */ `
  #define PI 3.141592653589793

  uniform vec3 uSunDirection;
  uniform vec3 uLineColor;
  uniform float uOpacity;

  varying vec3 vObjNormal;

  void main() {
    float sunAngle = dot(normalize(vObjNormal), normalize(uSunDirection));
    float dayFactor = smoothstep(-0.15, 0.01, sunAngle);
    float brightness = mix(0.15, 1.0, dayFactor);
    gl_FragColor = vec4(uLineColor * brightness, uOpacity);
  }
`;

const projLineVertexShader = /* glsl */ `
  #define PI 3.141592653589793

  varying vec3 vReconstructedNormal;

  void main() {
    // position.x = lon/180, position.y = lat/180
    float lonRad = position.x * PI;
    float latRad = position.y * PI;
    float phi = lonRad + PI;
    float theta = (PI / 2.0) - latRad;
    float sinTheta = sin(theta);
    vReconstructedNormal = vec3(
      -cos(phi) * sinTheta,
      cos(theta),
      sin(phi) * sinTheta
    );
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const projLineFragmentShader = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform vec3 uLineColor;
  uniform float uOpacity;

  varying vec3 vReconstructedNormal;

  void main() {
    float sunAngle = dot(normalize(vReconstructedNormal), normalize(uSunDirection));
    float dayFactor = smoothstep(-0.15, 0.01, sunAngle);
    float brightness = mix(0.15, 1.0, dayFactor);
    gl_FragColor = vec4(uLineColor * brightness, uOpacity);
  }
`;

// --- Coordinate extraction from GeoJSON ---

type CoordConverter = (lat: number, lon: number) => [number, number, number];

/** Extract line segments from a GeoJSON coordinate ring/line. */
function extractLineSegments(
  coords: [number, number][],
  convert: CoordConverter,
  positions: number[],
): void {
  for (let i = 0; i < coords.length - 1; i++) {
    const [lon0, lat0] = coords[i];
    const [lon1, lat1] = coords[i + 1];
    const [x0, y0, z0] = convert(lat0, lon0);
    const [x1, y1, z1] = convert(lat1, lon1);
    positions.push(x0, y0, z0, x1, y1, z1);
  }
}

/** Extract all line segments from a GeoJSON geometry. */
function extractGeometrySegments(
  geom: GeoJSONGeometry,
  convert: CoordConverter,
  positions: number[],
): void {
  switch (geom.type) {
    case 'LineString':
      extractLineSegments(geom.coordinates, convert, positions);
      break;
    case 'MultiLineString':
      for (const line of geom.coordinates) {
        extractLineSegments(line, convert, positions);
      }
      break;
    case 'Polygon':
      for (const ring of geom.coordinates) {
        extractLineSegments(ring, convert, positions);
      }
      break;
    case 'MultiPolygon':
      for (const polygon of geom.coordinates) {
        for (const ring of polygon) {
          extractLineSegments(ring, convert, positions);
        }
      }
      break;
  }
}

// --- Core factory ---

function createGeoLines(
  geoJson: GeoJSONFeatureCollection,
  target: 'globe' | 'projection',
  color: [number, number, number],
  opacity: number,
): OverlayGroup {
  const group = new Group();

  const convert: CoordConverter = target === 'globe'
    ? (lat, lon) => geoToGlobePosition(lat, lon, GLOBE_OVERLAY_RADIUS)
    : geoToProjectionPosition;

  const positions: number[] = [];
  for (const feature of geoJson.features) {
    extractGeometrySegments(feature.geometry, convert, positions);
  }

  if (positions.length === 0) {
    return { group, updateSunDirection: () => {} };
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));

  const material = new ShaderMaterial({
    vertexShader: target === 'globe' ? globeLineVertexShader : projLineVertexShader,
    fragmentShader: target === 'globe' ? globeLineFragmentShader : projLineFragmentShader,
    uniforms: {
      uSunDirection: { value: new Vector3(0, 0, 1) },
      uLineColor: { value: new Vector3(color[0], color[1], color[2]) },
      uOpacity: { value: opacity },
    },
    transparent: true,
    depthWrite: false,
  });

  group.add(new LineSegments(geometry, material));

  function updateSunDirection(sunDir: Vector3): void {
    material.uniforms.uSunDirection.value.copy(sunDir);
  }

  return { group, updateSunDirection };
}

// --- Convenience exports ---

/** Coastline overlay: thin dark outlines along continental edges. */
export function createCoastlineOverlay(target: 'globe' | 'projection'): OverlayGroup {
  return createGeoLines(
    coastlineData as unknown as GeoJSONFeatureCollection,
    target,
    [0.24, 0.35, 0.24], // #3d5a3d
    0.7,
  );
}

/** River overlay: subtle blue lines for major rivers. */
export function createRiverOverlay(target: 'globe' | 'projection'): OverlayGroup {
  return createGeoLines(
    riverData as unknown as GeoJSONFeatureCollection,
    target,
    [0.23, 0.42, 0.55], // #3a6b8c
    0.5,
  );
}

/** Lake overlay: blue outlines for major lakes. */
export function createLakeOverlay(target: 'globe' | 'projection'): OverlayGroup {
  return createGeoLines(
    lakeData as unknown as GeoJSONFeatureCollection,
    target,
    [0.23, 0.42, 0.55], // #3a6b8c
    0.5,
  );
}

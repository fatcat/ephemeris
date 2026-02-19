/**
 * Location marker — a small dot/pin sprite placed at the user's
 * saved location on both the globe and projection.
 */

import {
  Sprite,
  SpriteMaterial,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  CanvasTexture,
  Vector3,
  Quaternion,
} from 'three';
import { geoToGlobePosition, geoToProjectionPosition } from '../utils/geo.js';

const TEX_SIZE = 38;
const HALF = TEX_SIZE / 2;

function createLocationTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;

  // Simple solid red dot
  ctx.beginPath();
  ctx.arc(HALF, HALF, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#dc0202';
  ctx.fill();

  return new CanvasTexture(canvas);
}

let sharedTex: CanvasTexture | null = null;
function getLocationTex(): CanvasTexture {
  if (!sharedTex) sharedTex = createLocationTexture();
  return sharedTex;
}

export function createLocationMarker(size: number, depthTest = false): Sprite {
  const mat = new SpriteMaterial({
    map: getLocationTex(),
    depthTest,
    transparent: true,
  });
  const sprite = new Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}

/**
 * Create a location-marker Mesh (PlaneGeometry) for the globe.
 * Lies flat against the sphere surface.
 */
export function createLocationMarkerGlobe(size: number): Mesh {
  const geo = new PlaneGeometry(size, size);
  const mat = new MeshBasicMaterial({
    map: getLocationTex(),
    depthTest: true,
    transparent: true,
  });
  return new Mesh(geo, mat);
}

const _zAxis = new Vector3(0, 0, 1);
const _normal = new Vector3();
const _quat = new Quaternion();

export function updateLocationMarkerGlobe(
  mesh: Mesh,
  latDeg: number,
  lonDeg: number,
  radius = 1,
): void {
  const [x, y, z] = geoToGlobePosition(latDeg, lonDeg, radius + 0.005);
  mesh.position.set(x, y, z);
  _normal.set(x, y, z).normalize();
  _quat.setFromUnitVectors(_zAxis, _normal);
  mesh.quaternion.copy(_quat);
}

export function updateLocationMarkerProjection(
  sprite: Sprite,
  latDeg: number,
  lonDeg: number,
): void {
  const [x, y, z] = geoToProjectionPosition(latDeg, lonDeg);
  sprite.position.set(x, y, z + 0.002);
}

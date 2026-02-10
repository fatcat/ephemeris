/**
 * Subsolar point marker — a small stylized sun sprite placed at
 * the point on Earth's surface directly beneath the sun.
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

const TEX_SIZE = 64;
const HALF = TEX_SIZE / 2;

/** Draw a small stylized sun glyph on a canvas. */
function createSunTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;

  // Outer glow
  const glow = ctx.createRadialGradient(HALF, HALF, 6, HALF, HALF, HALF - 2);
  glow.addColorStop(0, 'rgba(255, 220, 60, 1.0)');
  glow.addColorStop(0.4, 'rgba(255, 180, 30, 0.6)');
  glow.addColorStop(1, 'rgba(255, 150, 0, 0.0)');
  ctx.beginPath();
  ctx.arc(HALF, HALF, HALF - 2, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  // Rays (8 short lines)
  ctx.strokeStyle = 'rgba(255, 210, 50, 0.7)';
  ctx.lineWidth = 1.5;
  const innerR = 10;
  const outerR = 20;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(HALF + Math.cos(a) * innerR, HALF + Math.sin(a) * innerR);
    ctx.lineTo(HALF + Math.cos(a) * outerR, HALF + Math.sin(a) * outerR);
    ctx.stroke();
  }

  // Solid core disc
  ctx.beginPath();
  ctx.arc(HALF, HALF, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE066';
  ctx.fill();

  const tex = new CanvasTexture(canvas);
  return tex;
}

// Shared texture — created once, reused by all markers.
let sharedTex: CanvasTexture | null = null;
function getSunTex(): CanvasTexture {
  if (!sharedTex) sharedTex = createSunTexture();
  return sharedTex;
}

/**
 * Create a sun-marker Sprite. `size` is in world units
 * (e.g. 0.1 = 5 % of a radius-1 globe's diameter).
 */
export function createSunMarker(size: number, depthTest = false): Sprite {
  const mat = new SpriteMaterial({
    map: getSunTex(),
    depthTest,
    transparent: true,
  });
  const sprite = new Sprite(mat);
  sprite.scale.set(size, size, 1);
  return sprite;
}

/**
 * Create a sun-marker Mesh (PlaneGeometry) for the globe.
 * Unlike the Sprite version, this lies flat against the sphere surface.
 */
export function createSunMarkerGlobe(size: number): Mesh {
  const geo = new PlaneGeometry(size, size);
  const mat = new MeshBasicMaterial({
    map: getSunTex(),
    depthTest: true,
    transparent: true,
  });
  return new Mesh(geo, mat);
}

const _zAxis = new Vector3(0, 0, 1);
const _normal = new Vector3();
const _quat = new Quaternion();

/**
 * Position the mesh at the subsolar point on a unit sphere,
 * oriented tangent to the surface (flat against the globe).
 */
export function updateSunMarkerGlobe(
  mesh: Mesh,
  sunDir: Vector3,
  radius = 1,
): void {
  const r = radius + 0.005;
  mesh.position.set(sunDir.x * r, sunDir.y * r, sunDir.z * r);
  _normal.set(sunDir.x, sunDir.y, sunDir.z).normalize();
  _quat.setFromUnitVectors(_zAxis, _normal);
  mesh.quaternion.copy(_quat);
}

/**
 * Position the sprite on the equirectangular projection plane.
 *
 * The plane spans x ∈ [-1, 1] (lon −180° … 180°) and
 * y ∈ [-0.5, 0.5] (lat −90° … 90°).
 */
export function updateSunMarkerProjection(
  sprite: Sprite,
  sunDir: Vector3,
): void {
  const latRad = Math.asin(Math.max(-1, Math.min(1, sunDir.y)));

  // SphereGeometry maps: x = -cos(phi)*sin(θ), z = sin(phi)*sin(θ)
  // so phi = atan2(z, -x).  Wrap to [0, 2π] then shift to longitude.
  let phi = Math.atan2(sunDir.z, -sunDir.x);
  if (phi < 0) phi += 2 * Math.PI;
  const x = phi / Math.PI - 1;  // [0,2π]/π - 1 → [-1, 1]
  const y = latRad / Math.PI;   // −0.5 … 0.5
  sprite.position.set(x, y, 0.003);
}

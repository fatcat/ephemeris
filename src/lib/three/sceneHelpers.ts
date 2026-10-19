/**
 * Small helpers shared by the self-contained scenes (sundial, sky dome).
 */

import { CanvasTexture, type PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const DEG_TO_RAD = Math.PI / 180;

export interface TextTextureOptions {
  color: string;
  font?: string;
  /** Square canvas size in px */
  size?: number;
}

/** Create a square canvas texture with centered text on a transparent background. */
export function createTextTexture(text: string, opts: TextTextureOptions): CanvasTexture {
  const size = opts.size ?? 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = opts.color;
  ctx.font = opts.font ?? 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size / 2, size / 2);
  return new CanvasTexture(canvas);
}

export interface ConstrainedOrbitOptions {
  /** Zoom range as a fraction of the aimed distance (0.1 = ±10%) */
  zoomMargin?: number;
  polarMarginDeg?: number;
  azimuthMarginDeg?: number;
}

export interface ConstrainedOrbit {
  controls: OrbitControls;
  /** Move the camera and re-center the allowed orbit range on the new pose. */
  aim: (position: [number, number, number], target?: [number, number, number]) => void;
}

/**
 * OrbitControls that only allow a small wobble around a chosen camera pose:
 * no pan, limited zoom, limited polar and azimuth swing.
 */
export function createConstrainedOrbit(
  camera: PerspectiveCamera,
  domElement: HTMLElement,
  opts: ConstrainedOrbitOptions = {},
): ConstrainedOrbit {
  const zoomMargin = opts.zoomMargin ?? 0.1;
  const polarMargin = (opts.polarMarginDeg ?? 10) * DEG_TO_RAD;
  const azMargin = (opts.azimuthMarginDeg ?? 15) * DEG_TO_RAD;

  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.22;
  controls.enablePan = false;

  const offset = new Vector3();

  function aim(position: [number, number, number], target: [number, number, number] = [0, 0, 0]) {
    camera.position.set(...position);
    controls.target.set(...target);
    camera.lookAt(controls.target);

    offset.copy(camera.position).sub(controls.target);
    const dist = offset.length();
    controls.minDistance = dist * (1 - zoomMargin);
    controls.maxDistance = dist * (1 + zoomMargin);
    const polar = Math.acos(offset.y / dist);
    controls.minPolarAngle = polar - polarMargin;
    controls.maxPolarAngle = polar + polarMargin;
    const az = Math.atan2(offset.x, offset.z);
    controls.minAzimuthAngle = az - azMargin;
    controls.maxAzimuthAngle = az + azMargin;
    controls.update();
  }

  aim([camera.position.x, camera.position.y, camera.position.z]);
  return { controls, aim };
}

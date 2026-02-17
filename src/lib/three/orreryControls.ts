/**
 * Camera controls for the Orrery view.
 *
 * Uses Three.js OrbitControls with the target tracking Earth's position.
 * Pitch is clamped to ±30° above/below the ecliptic plane.
 * Polar angle PI/2 = ecliptic plane (horizontal).
 * ±30° gives range [PI/2 - PI/6, PI/2 + PI/6] = [PI/3, 2PI/3].
 */

import type { PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export function createOrreryControls(
  camera: PerspectiveCamera,
  domElement: HTMLElement,
): OrbitControls {
  const controls = new OrbitControls(camera, domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1;
  controls.maxDistance = 14;
  // Polar angle PI/2 = ecliptic plane. Clamp ±30° above/below.
  controls.minPolarAngle = Math.PI / 2 - Math.PI / 6; // 60° from top = 30° above ecliptic
  controls.maxPolarAngle = Math.PI / 2 + Math.PI / 6; // 120° from top = 30° below ecliptic
  return controls;
}

/** Update the controls target to track Earth's position. */
export function updateOrreryTarget(controls: OrbitControls, earthPos: Vector3): void {
  controls.target.copy(earthPos);
}

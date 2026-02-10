/**
 * Custom globe spin controls.
 *
 * Instead of orbiting the camera (which changes the apparent tilt),
 * this rotates the globe around its own Y-axis inside the tilt group.
 * The camera stays fixed, so the axial tilt always appears the same.
 *
 * Supports:
 * - Mouse drag / touch drag → spin around Y-axis
 * - Mouse wheel / pinch → zoom (camera distance)
 * - Inertia / damping for smooth deceleration
 */

import type { PerspectiveCamera, Group } from 'three';

const MIN_DISTANCE = 2.5;
const MAX_DISTANCE = 4.5;
const SPIN_SENSITIVITY = 0.005;
const DAMPING_DEFAULT = 0.92;
const MIN_VELOCITY = 0.0001;
const ZOOM_SENSITIVITY = 0.001;
const reducedMotion = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DAMPING = reducedMotion ? 0 : DAMPING_DEFAULT;

export interface GlobeControls {
  update: () => void;
  dispose: () => void;
  /** Smoothly animate spinGroup.rotation.y to the target value over ~1.5s */
  resetTo: (targetRotationY: number) => void;
  /** Set the camera's ecliptic latitude (pitch). instant=true skips animation. */
  setCameraLatitude: (latDeg: number, instant?: boolean) => void;
}

export function createGlobeControls(
  camera: PerspectiveCamera,
  canvas: HTMLElement,
  spinGroup: Group,
): GlobeControls {
  let isDragging = false;
  let prevX = 0;
  let velocity = 0;

  function onPointerDown(e: PointerEvent) {
    isDragging = true;
    prevX = e.clientX;
    velocity = 0;
    canvas.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const dx = e.clientX - prevX;
    prevX = e.clientX;
    velocity = dx * SPIN_SENSITIVITY;
    spinGroup.rotation.y += velocity;
  }

  function onPointerUp(e: PointerEvent) {
    isDragging = false;
    canvas.releasePointerCapture(e.pointerId);
  }

  // Current camera latitude in radians (0 = equator, positive = north)
  let camLatRad = 0;

  /** Reposition camera at current latitude and distance */
  function applyCameraPosition(dist: number) {
    camera.position.set(0, dist * Math.sin(camLatRad), dist * Math.cos(camLatRad));
    camera.lookAt(0, 0, 0);
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const dist = camera.position.length();
    const newDist = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, dist + e.deltaY * ZOOM_SENSITIVITY));
    applyCameraPosition(newDist);
  }

  // Touch zoom (pinch)
  let lastPinchDist = 0;

  function onTouchStart(e: TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist = Math.sqrt(dx * dx + dy * dy);
    }
  }

  function onTouchMove(e: TouchEvent) {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const pinchDist = Math.sqrt(dx * dx + dy * dy);
      const delta = (lastPinchDist - pinchDist) * ZOOM_SENSITIVITY * 2;
      lastPinchDist = pinchDist;
      const camDist = camera.position.length();
      const newDist = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, camDist + delta));
      applyCameraPosition(newDist);
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });

  // Smooth reset animation state (spin)
  let resetTarget: number | null = null;
  let resetStart: number | null = null;
  let resetFrom: number | null = null;
  const RESET_DURATION = reducedMotion ? 0.05 : 1.5; // seconds

  // Smooth camera latitude animation state
  let latTarget: number | null = null;
  let latStart: number | null = null;
  let latFrom: number | null = null;

  function update() {
    // Handle reset animation
    if (resetTarget !== null && resetStart !== null && resetFrom !== null) {
      const elapsed = (performance.now() - resetStart) / 1000;
      const t = Math.min(1, elapsed / RESET_DURATION);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      spinGroup.rotation.y = resetFrom + (resetTarget - resetFrom) * eased;
      if (t >= 1) {
        resetTarget = null;
        resetStart = null;
        resetFrom = null;
      }
      velocity = 0;
      return;
    }

    if (!isDragging && Math.abs(velocity) > MIN_VELOCITY) {
      spinGroup.rotation.y += velocity;
      velocity *= DAMPING;
    } else if (!isDragging) {
      velocity = 0;
    }

    // Handle camera latitude animation
    if (latTarget !== null && latStart !== null && latFrom !== null) {
      const elapsed = (performance.now() - latStart) / 1000;
      const t = Math.min(1, elapsed / RESET_DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      camLatRad = latFrom + (latTarget - latFrom) * eased;
      applyCameraPosition(camera.position.length());
      if (t >= 1) {
        latTarget = null;
        latStart = null;
        latFrom = null;
      }
    }
  }

  function resetTo(targetRotationY: number) {
    velocity = 0;
    resetFrom = spinGroup.rotation.y;
    // Normalize the difference to take the shortest path
    let diff = targetRotationY - resetFrom;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    resetTarget = resetFrom + diff;
    resetStart = performance.now();
  }

  function setCameraLatitude(latDeg: number, instant?: boolean) {
    const target = latDeg * Math.PI / 180;
    if (instant) {
      camLatRad = target;
      applyCameraPosition(camera.position.length());
      latTarget = null;
      latStart = null;
      latFrom = null;
      return;
    }
    latFrom = camLatRad;
    latTarget = target;
    latStart = performance.now();
  }

  function dispose() {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
  }

  return { update, dispose, resetTo, setCameraLatitude };
}

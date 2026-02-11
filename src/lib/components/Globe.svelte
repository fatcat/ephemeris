<script lang="ts">
  import { onMount } from 'svelte';
  import { createGlobeScene, type GlobeScene } from '../three/scene.js';
  import { createGlobeControls, type GlobeControls } from '../three/controls.js';
  import { getSunDirection } from '../stores/time.js';
  import {
    hardTerminator,
    showMinorGrid,
    showMajorGrid,
    showEquatorTropics,
    showEquatorTropicsLabels,
    showArcticCircles,
    showArcticCirclesLabels,
    showContinentLabels,
    showOceanLabels,
    showSubsolarPoint,
    showNightLights,
    userLocation,
    cameraLatitude,
    axialTilt,
    REAL_AXIAL_TILT,
    type UserLocation,
  } from '../stores/settings.js';
  import { updateSunMarkerGlobe } from '../three/sunMarker.js';
  import { updateLocationMarkerGlobe } from '../three/locationMarker.js';
  import { updateSpecialLatitudes } from '../three/gridLines.js';
  import { geoToGlobePosition } from '../utils/geo.js';
  import type { GeoLabel } from '../types/geo.js';
  import labelsData from '../../assets/geo/labels.json';
  import { Vector3, Raycaster, Vector2, type Texture } from 'three';

  interface Props {
    sharedTexture: Texture;
    nightTexture: Texture;
  }

  let { sharedTexture, nightTexture }: Props = $props();

  let container: HTMLDivElement;
  let globeScene: GlobeScene | null = $state(null);
  let globeControls: GlobeControls | null = $state(null);
  let hard = $state(false);
  let minorGrid = $state(true);
  let majorGrid = $state(true);
  let eqTropics = $state(true);
  let eqTropicsLabels = $state(true);
  let arcticCirc = $state(true);
  let arcticCircLabels = $state(true);
  let continentLabels = $state(true);
  let oceanLabels = $state(true);
  let subsolar = $state(true);
  let nightLights = $state(true);
  let loc: UserLocation = $state({ name: '', lat: 0, lon: 0 });
  let tilt = $state(REAL_AXIAL_TILT);
  let prevTilt = REAL_AXIAL_TILT;
  axialTilt.subscribe((v) => (tilt = v));
  hardTerminator.subscribe((v) => (hard = v));
  showMinorGrid.subscribe((v) => (minorGrid = v));
  showMajorGrid.subscribe((v) => (majorGrid = v));
  showEquatorTropics.subscribe((v) => (eqTropics = v));
  showEquatorTropicsLabels.subscribe((v) => (eqTropicsLabels = v));
  showArcticCircles.subscribe((v) => (arcticCirc = v));
  showArcticCirclesLabels.subscribe((v) => (arcticCircLabels = v));
  showContinentLabels.subscribe((v) => (continentLabels = v));
  showOceanLabels.subscribe((v) => (oceanLabels = v));
  showSubsolarPoint.subscribe((v) => (subsolar = v));
  showNightLights.subscribe((v) => (nightLights = v));
  userLocation.subscribe((v) => (loc = v));

  // Globe labels — always-visible set (continents, oceans, seas)
  const allLabels = labelsData as GeoLabel[];
  const geoLabels = allLabels.filter(
    (l) => l.type === 'continent' || l.type === 'ocean',
  );

  // Special latitude labels
  interface SpecialLabel {
    name: string;
    lat: number;
    lon: number;
    kind: 'warm' | 'cool';
  }

  let specialLabels: SpecialLabel[] = $derived([
    { name: 'Equator', lat: 0, lon: 0, kind: 'warm' as const },
    { name: 'Tropic of Cancer', lat: tilt, lon: 0, kind: 'warm' as const },
    { name: 'Tropic of Capricorn', lat: -tilt, lon: 0, kind: 'warm' as const },
    { name: 'Arctic Circle', lat: 90 - tilt, lon: 0, kind: 'cool' as const },
    { name: 'Antarctic Circle', lat: -(90 - tilt), lon: 0, kind: 'cool' as const },
  ]);

  interface LabelPos {
    label: GeoLabel | SpecialLabel;
    x: number;
    y: number;
    opacity: number;
    visible: boolean;
    isSpecial: boolean;
  }

  let labelPositions: LabelPos[] = $state([]);
  let containerRect = { width: 0, height: 0 };
  const tmpVec = new Vector3();

  // Click-to-set-location via raycasting
  const raycaster = new Raycaster();
  const pointerNdc = new Vector2();
  let pointerDownPos: { x: number; y: number } | null = null;
  const CLICK_THRESHOLD_SQ = 25; // 5px²

  function onGlobePointerDown(e: PointerEvent) {
    pointerDownPos = { x: e.clientX, y: e.clientY };
  }

  function onGlobePointerUp(e: PointerEvent) {
    if (!pointerDownPos || !globeScene) return;
    const dx = e.clientX - pointerDownPos.x;
    const dy = e.clientY - pointerDownPos.y;
    pointerDownPos = null;
    if (dx * dx + dy * dy >= CLICK_THRESHOLD_SQ) return;

    const rect = container.getBoundingClientRect();
    pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointerNdc, globeScene.camera);
    const intersects = raycaster.intersectObject(globeScene.globe);
    if (intersects.length === 0) return;

    // Convert world-space hit to spinGroup local coords (geographic frame)
    const localPt = intersects[0].point.clone();
    globeScene.spinGroup.worldToLocal(localPt);

    const r = localPt.length();
    const lat = Math.asin(localPt.y / r) * (180 / Math.PI);
    let phi = Math.atan2(localPt.z, -localPt.x);
    if (phi < 0) phi += 2 * Math.PI;
    const lon = phi * (180 / Math.PI) - 180;

    userLocation.set({
      name: '',
      lat: Math.round(lat * 100) / 100,
      lon: Math.round(lon * 100) / 100,
    });
  }

  /** Project globe labels to screen coordinates. */
  function updateGlobeLabels(scene: GlobeScene): void {
    if (containerRect.width === 0) return;

    const results: LabelPos[] = [];
    const camera = scene.camera;

    // Geo labels (conditional by type)
    for (const label of geoLabels) {
      const show = label.type === 'continent' ? continentLabels : oceanLabels;
      if (!show) {
        results.push({ label, x: 0, y: 0, opacity: 0, visible: false, isSpecial: false });
        continue;
      }
      const [gx, gy, gz] = geoToGlobePosition(label.lat, label.lon, 1.01);
      tmpVec.set(gx, gy, gz);
      scene.spinGroup.localToWorld(tmpVec);

      const facingFactor = tmpVec.z;
      if (facingFactor < -0.05) {
        results.push({ label, x: 0, y: 0, opacity: 0, visible: false, isSpecial: false });
        continue;
      }

      const opacity = facingFactor < 0.2
        ? Math.max(0, (facingFactor + 0.05) / 0.25)
        : 0.85;

      const projected = tmpVec.project(camera);
      const x = (projected.x + 1) / 2 * containerRect.width;
      const y = (1 - projected.y) / 2 * containerRect.height;

      results.push({ label, x, y, opacity, visible: true, isSpecial: false });
    }

    // Special latitude labels (conditional visibility)
    for (const label of specialLabels) {
      const show = label.kind === 'warm' ? eqTropicsLabels : arcticCircLabels;
      if (!show) {
        results.push({ label, x: 0, y: 0, opacity: 0, visible: false, isSpecial: true });
        continue;
      }

      const [gx, gy, gz] = geoToGlobePosition(label.lat, label.lon, 1.01);
      tmpVec.set(gx, gy, gz);
      scene.spinGroup.localToWorld(tmpVec);

      const facingFactor = tmpVec.z;
      if (facingFactor < -0.05) {
        results.push({ label, x: 0, y: 0, opacity: 0, visible: false, isSpecial: true });
        continue;
      }

      const opacity = facingFactor < 0.2
        ? Math.max(0, (facingFactor + 0.05) / 0.25)
        : 0.9;

      const projected = tmpVec.project(camera);
      const x = (projected.x + 1) / 2 * containerRect.width;
      const y = (1 - projected.y) / 2 * containerRect.height;

      results.push({ label, x, y, opacity, visible: true, isSpecial: true });
    }

    labelPositions = results;
  }

  const DEG_TO_RAD = Math.PI / 180;

  /** Smoothly reset the globe view to center on the saved location */
  export function resetView() {
    if (!globeControls) return;
    const targetY = (loc.lon + 90) * DEG_TO_RAD;
    globeControls.resetTo(targetY);
  }

  /** Called by the parent's animation loop */
  export function render() {
    if (!globeControls || !globeScene) return;
    const sunDir = getSunDirection();
    globeScene.material.uniforms.uSunDirection.value.copy(sunDir);
    globeScene.material.uniforms.uHardTerminator.value = hard ? 1.0 : 0.0;
    globeScene.material.uniforms.uShowNightLights.value = nightLights ? 1.0 : 0.0;

    // Update visual tilt and grid lines when axial tilt changes
    if (tilt !== prevTilt) {
      globeScene.tiltGroup.rotation.z = -(tilt * DEG_TO_RAD);
      updateSpecialLatitudes(globeScene.grid, tilt);
      prevTilt = tilt;
    }

    // Update overlay sun direction uniforms
    globeScene.coastlineOverlay.updateSunDirection(sunDir);
    globeScene.riverOverlay.updateSunDirection(sunDir);
    globeScene.lakeOverlay.updateSunDirection(sunDir);

    // Subsolar point marker
    updateSunMarkerGlobe(globeScene.sunMarker, sunDir);
    globeScene.sunMarker.visible = subsolar;

    // Location marker
    updateLocationMarkerGlobe(globeScene.locationMarker, loc.lat, loc.lon);

    // Toggle grid visibility
    globeScene.grid.majorLines.visible = majorGrid;
    globeScene.grid.minorLines.visible = minorGrid;
    globeScene.grid.equatorTropicsLines.visible = eqTropics;
    globeScene.grid.arcticCircleLines.visible = arcticCirc;

    globeControls.update();
    globeScene.renderer.render(globeScene.scene, globeScene.camera);

    // Update label positions after rendering
    updateGlobeLabels(globeScene);
  }

  onMount(() => {
    globeScene = createGlobeScene(container, sharedTexture, nightTexture);
    globeControls = createGlobeControls(
      globeScene.camera,
      globeScene.renderer.domElement,
      globeScene.spinGroup,
    );

    // Initial size
    const rect = container.getBoundingClientRect();
    containerRect = { width: rect.width, height: rect.height };
    globeScene.resize(rect.width, rect.height);

    // Set initial camera latitude instantly, then animate future changes
    let camLatInitialized = false;
    const unsubCamLat = cameraLatitude.subscribe((lat) => {
      if (!camLatInitialized) {
        globeControls?.setCameraLatitude(lat, true);
        camLatInitialized = true;
      } else {
        globeControls?.setCameraLatitude(lat);
      }
    });

    // Observe container resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          containerRect = { width, height };
          globeScene?.resize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      unsubCamLat();
      resizeObserver.disconnect();
      globeControls?.dispose();
      globeScene?.dispose();
    };
  });
</script>

<div class="globe-container" bind:this={container} onpointerdown={onGlobePointerDown} onpointerup={onGlobePointerUp} role="application" aria-label="Interactive globe — click to set location">
  <div class="globe-labels">
    {#each labelPositions as lp (lp.label.name)}
      {#if lp.visible}
        {#if lp.isSpecial}
          {@const sl = lp.label as { name: string; kind: string }}
          <span
            class="special-label special-label--{sl.kind}"
            style="left: {lp.x}px; top: {lp.y}px; opacity: {lp.opacity};"
          >
            {sl.name}
          </span>
        {:else}
          {@const gl = lp.label as GeoLabel}
          <span
            class="geo-label geo-label--{gl.type}"
            style="left: {lp.x}px; top: {lp.y}px; opacity: {lp.opacity};"
          >
            {gl.name}
          </span>
        {/if}
      {/if}
    {/each}
  </div>
</div>

<style>
  .globe-container {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden;
  }

  .globe-container :global(canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .globe-labels {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
  }

  .geo-label {
    position: absolute;
    transform: translate(-50%, -50%);
    white-space: nowrap;
    pointer-events: none;
    text-shadow:
      0 0 4px rgba(0, 0, 0, 1),
      0 0 8px rgba(0, 0, 0, 0.9),
      0 1px 3px rgba(0, 0, 0, 1),
      0 0 12px rgba(0, 0, 0, 0.6);
    line-height: 1;
  }

  .geo-label--continent {
    font-variant: small-caps;
    font-weight: 600;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.95);
    letter-spacing: 0.15em;
  }

  .geo-label--ocean {
    font-style: italic;
    font-size: 0.83rem;
    color: rgba(180, 205, 240, 0.9);
    letter-spacing: 0.1em;
  }

  .geo-label--sea {
    font-style: italic;
    font-size: 0.68rem;
    color: rgba(160, 185, 220, 0.85);
  }

  .special-label {
    position: absolute;
    transform: translate(-50%, -50%);
    white-space: nowrap;
    pointer-events: none;
    text-shadow:
      0 0 4px rgba(0, 0, 0, 1),
      0 0 8px rgba(0, 0, 0, 0.9),
      0 1px 3px rgba(0, 0, 0, 1),
      0 0 12px rgba(0, 0, 0, 0.6);
    line-height: 1;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
  }

  .special-label--warm {
    color: rgba(212, 164, 76, 0.95);
  }

  .special-label--cool {
    color: rgba(107, 163, 199, 0.95);
  }
</style>

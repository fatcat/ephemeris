<script lang="ts">
  import { onMount } from 'svelte';
  import type { Texture } from 'three';
  import {
    createProjectionScene,
    type ProjectionScene,
  } from '../three/projectionScene.js';
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
    axialTilt,
    REAL_AXIAL_TILT,
    currentThemeId,
    type UserLocation,
  } from '../stores/settings.js';
  import { getThemeById, type Theme } from '../themes.js';
  import { updateSunMarkerProjection } from '../three/sunMarker.js';
  import { updateLocationMarkerProjection } from '../three/locationMarker.js';
  import { lonToPercent, latToPercent } from '../utils/geo.js';
  import type { GeoLabel } from '../types/geo.js';
  import labelsData from '../../assets/geo/labels.json';

  interface Props {
    sharedTexture: Texture;
    nightTexture: Texture;
  }

  let { sharedTexture, nightTexture }: Props = $props();

  let container: HTMLDivElement;
  let projScene: ProjectionScene | null = $state(null);
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
  axialTilt.subscribe((v) => (tilt = v));
  let currentTheme: Theme = $state(getThemeById('midnight'));
  currentThemeId.subscribe((v) => (currentTheme = getThemeById(v)));

  // Geo labels (continents, oceans, seas only)
  const allLabels = labelsData as GeoLabel[];
  const geoLabels = allLabels.filter(
    (l) => l.type === 'continent' || l.type === 'ocean',
  );

  // Grid label positions (every 15 degrees, filtered by canvas size)
  const allLatLabels: { deg: number; pct: number }[] = [];
  const allLonLabels: { deg: number; pct: number }[] = [];

  for (let lat = -90; lat <= 90; lat += 15) {
    const pct = (1 - (0.5 + lat / 180)) * 100;
    allLatLabels.push({ deg: lat, pct });
  }

  for (let lon = -180; lon <= 180; lon += 15) {
    const pct = (0.5 + lon / 360) * 100;
    allLonLabels.push({ deg: lon, pct });
  }

  // Reactive canvas width for adaptive lon label density
  let canvasW = $state(0);

  const lonStep = $derived(canvasW < 500 ? 60 : canvasW < 1100 ? 30 : 15);

  const latLabels = allLatLabels.filter((l) => Math.abs(l.deg) !== 90);
  const lonLabels = $derived(allLonLabels.filter((l) => l.deg % lonStep === 0 && Math.abs(l.deg) !== 180));

  function formatLat(deg: number): string {
    if (deg === 0) return '0\u00B0';
    return `${Math.abs(deg)}\u00B0${deg > 0 ? 'N' : 'S'}`;
  }

  function formatLon(deg: number): string {
    if (deg === 0) return '0\u00B0';
    if (Math.abs(deg) === 180) return '180\u00B0';
    return `${Math.abs(deg)}\u00B0${deg > 0 ? 'E' : 'W'}`;
  }

  // Special latitude labels
  interface SpecialLatLabel {
    name: string;
    lat: number;
    kind: 'warm' | 'cool';
  }

  let specialLatLabels: SpecialLatLabel[] = $derived([
    { name: 'Equator', lat: 0, kind: 'warm' as const },
    { name: 'Tropic of Cancer', lat: tilt, kind: 'warm' as const },
    { name: 'Tropic of Capricorn', lat: -tilt, kind: 'warm' as const },
    { name: 'Arctic Circle', lat: 90 - tilt, kind: 'cool' as const },
    { name: 'Antarctic Circle', lat: -(90 - tilt), kind: 'cool' as const },
  ]);

  // Click-to-set-location
  let pointerDownPos: { x: number; y: number } | null = null;
  const CLICK_THRESHOLD_SQ = 25; // 5px²

  function onProjPointerDown(e: PointerEvent) {
    pointerDownPos = { x: e.clientX, y: e.clientY };
  }

  function onProjPointerUp(e: PointerEvent) {
    if (!pointerDownPos || !projScene) return;
    const dx = e.clientX - pointerDownPos.x;
    const dy = e.clientY - pointerDownPos.y;
    pointerDownPos = null;
    if (dx * dx + dy * dy >= CLICK_THRESHOLD_SQ) return;

    const rect = container.getBoundingClientRect();
    const cr = projScene.canvasRect;
    const xRel = e.clientX - rect.left - cr.left;
    const yRel = e.clientY - rect.top - cr.top;

    if (xRel < 0 || xRel > cr.width || yRel < 0 || yRel > cr.height) return;

    const lon = (xRel / cr.width - 0.5) * 360;
    const lat = (0.5 - yRel / cr.height) * 180;

    userLocation.set({
      name: '',
      lat: Math.round(lat * 100) / 100,
      lon: Math.round(lon * 100) / 100,
    });
  }

  /** Called by the parent's animation loop */
  export function render() {
    if (!projScene) return;
    const sunDir = getSunDirection();
    projScene.material.uniforms.uSunDirection.value.copy(sunDir);
    projScene.material.uniforms.uHardTerminator.value = hard ? 1.0 : 0.0;

    // Grid visibility uniforms
    projScene.material.uniforms.uShowMajorGrid.value = majorGrid ? 1.0 : 0.0;
    projScene.material.uniforms.uShowMinorGrid.value = minorGrid ? 1.0 : 0.0;
    projScene.material.uniforms.uShowEquatorTropics.value = eqTropics ? 1.0 : 0.0;
    projScene.material.uniforms.uShowArcticCircles.value = arcticCirc ? 1.0 : 0.0;
    projScene.material.uniforms.uShowNightLights.value = nightLights ? 1.0 : 0.0;
    projScene.material.uniforms.uMapBrightness.value = currentTheme.mapBrightness;
    projScene.renderer.setClearColor(currentTheme.clearColor);

    // Update special latitude uniforms from current tilt
    projScene.material.uniforms.uTropicLat.value = tilt;
    projScene.material.uniforms.uArcticLat.value = 90 - tilt;

    // Update overlay sun direction uniforms
    projScene.coastlineOverlay.updateSunDirection(sunDir);
    projScene.riverOverlay.updateSunDirection(sunDir);
    projScene.lakeOverlay.updateSunDirection(sunDir);

    // Subsolar point marker
    updateSunMarkerProjection(projScene.sunMarker, sunDir);
    projScene.sunMarker.visible = subsolar;

    // Location marker
    updateLocationMarkerProjection(projScene.locationMarker, loc.lat, loc.lon);

    projScene.renderer.render(projScene.scene, projScene.camera);
  }

  onMount(() => {
    projScene = createProjectionScene(container, sharedTexture, nightTexture);

    const rect = container.getBoundingClientRect();
    projScene.resize(rect.width, rect.height);
    canvasW = projScene.canvasRect.width;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          projScene?.resize(width, height);
          canvasW = projScene!.canvasRect.width;
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      projScene?.dispose();
    };
  });
</script>

<div
  class="projection-container"
  bind:this={container}
  onpointerdown={onProjPointerDown}
  onpointerup={onProjPointerUp}
  role="application"
  aria-label="Interactive projection — click to set location"
>
  <div class="label-overlay">
    {#if majorGrid}
      <div class="grid-labels">
        {#each latLabels as l (l.deg)}
          <span class="grid-label lat-label" style="top: {l.pct}%; left: 0;">{formatLat(l.deg)}</span>
        {/each}
        {#each lonLabels as l (l.deg)}
          <span class="grid-label lon-label" style="left: {l.pct}%; bottom: 0;">{formatLon(l.deg)}</span>
        {/each}
      </div>
    {/if}

    <div class="geo-labels">
      {#each geoLabels as label (label.name)}
        {#if (label.type === 'continent' && continentLabels) || (label.type === 'ocean' && oceanLabels)}
          <span
            class="geo-label geo-label--{label.type}"
            style="left: {lonToPercent(label.lon)}%; top: {latToPercent(label.lat)}%;"
          >
            {label.name}
          </span>
        {/if}
      {/each}
    </div>

    <div class="special-labels">
      {#each specialLatLabels as sl (sl.name)}
        {#if (sl.kind === 'warm' && eqTropicsLabels) || (sl.kind === 'cool' && arcticCircLabels)}
          <span
            class="special-label special-label--{sl.kind}"
            style="top: {latToPercent(sl.lat)}%; right: 1%;"
          >
            {sl.name}
          </span>
        {/if}
      {/each}
    </div>
  </div>
</div>

<style>
  .projection-container {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden;
    container-type: size;
    cursor: crosshair;
  }

  .label-overlay {
    position: absolute;
    pointer-events: none;
    z-index: 1;
    overflow: hidden;
    /* Match the 2:1 canvas using container query units */
    width: min(100cqw, 200cqh);
    height: min(50cqw, 100cqh);
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  .grid-labels {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .grid-label {
    position: absolute;
    font-size: 0.83rem;
    color: rgba(200, 200, 220, 0.95);
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    white-space: nowrap;
    -webkit-text-stroke: 3px rgba(0, 0, 0, 0.9);
    paint-order: stroke fill;
  }

  .lat-label {
    transform: translateY(-50%);
    padding-left: 2px;
  }

  .lon-label {
    transform: translateX(-50%);
    padding-bottom: 1px;
  }

  .geo-labels {
    position: absolute;
    inset: 0;
    pointer-events: none;
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

  .special-labels {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .special-label {
    position: absolute;
    transform: translateY(2px);
    white-space: nowrap;
    pointer-events: none;
    text-shadow:
      0 0 4px rgba(0, 0, 0, 1),
      0 0 8px rgba(0, 0, 0, 0.9),
      0 1px 3px rgba(0, 0, 0, 1),
      0 0 12px rgba(0, 0, 0, 0.6);
    line-height: 1;
    font-size: 0.83rem;
    font-weight: 600;
    letter-spacing: 0.06em;
  }

  .special-label--warm {
    color: rgba(212, 164, 76, 0.95);
  }

  .special-label--cool {
    color: rgba(107, 163, 199, 0.95);
  }
</style>

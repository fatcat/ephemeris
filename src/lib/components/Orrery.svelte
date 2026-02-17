<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { Vector3, type Texture } from 'three';
  import { createOrreryScene, SEASON_POSITIONS, EARTH_RADIUS, type OrreryScene } from '../three/orreryScene.js';
  import { createOrreryControls, updateOrreryTarget } from '../three/orreryControls.js';
  import { updateSunMarkerGlobe } from '../three/sunMarker.js';
  import { updateLocationMarkerGlobe } from '../three/locationMarker.js';
  import { updateSpecialLatitudes } from '../three/gridLines.js';
  import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import { currentTime } from '../stores/time.js';
  import { solarPosition, greenwichMeanSiderealTime, julianDay } from '../astronomy/solar.js';
  import {
    axialTilt,
    REAL_AXIAL_TILT,
    currentThemeId,
    hardTerminator,
    showNightLights,
    showSubsolarPoint,
    showEquatorTropics,
    showArcticCircles,
    showMajorGrid,
    showMinorGrid,
    userLocation,
    type UserLocation,
  } from '../stores/settings.js';
  import { getThemeById } from '../themes.js';

  interface Props {
    sharedTexture: Texture;
    nightTexture: Texture;
  }

  let { sharedTexture, nightTexture }: Props = $props();

  let container: HTMLDivElement;
  let orreryScene: OrreryScene | null = $state(null);
  let controls: OrbitControls | null = $state(null);
  let tilt = $state(REAL_AXIAL_TILT);
  let prevTilt = REAL_AXIAL_TILT;
  axialTilt.subscribe((v) => (tilt = v));

  let themeId = $state('charcoal');
  currentThemeId.subscribe((v) => (themeId = v));

  let hard = $state(false);
  hardTerminator.subscribe((v) => (hard = v));

  let nightLights = $state(true);
  showNightLights.subscribe((v) => (nightLights = v));

  let subsolar = $state(true);
  showSubsolarPoint.subscribe((v) => (subsolar = v));

  let eqTropics = $state(false);
  showEquatorTropics.subscribe((v) => (eqTropics = v));

  let arcticCirc = $state(false);
  showArcticCircles.subscribe((v) => (arcticCirc = v));

  let majorGrid = $state(true);
  showMajorGrid.subscribe((v) => (majorGrid = v));

  let minorGrid = $state(false);
  showMinorGrid.subscribe((v) => (minorGrid = v));

  let loc: UserLocation = $state({ name: '', lat: 0, lon: 0 });
  userLocation.subscribe((v) => (loc = v));

  const DEG_TO_RAD = Math.PI / 180;

  // Season label projection
  interface SeasonLabelPos {
    label: string;
    x: number;
    y: number;
    visible: boolean;
  }

  let seasonLabels: SeasonLabelPos[] = $state([]);
  let containerRect = { width: 0, height: 0 };
  const tmpVec = new Vector3();

  function updateSeasonLabels(scene: OrreryScene): void {
    if (containerRect.width === 0) return;

    const results: SeasonLabelPos[] = [];
    const camera = scene.camera;

    for (const sp of SEASON_POSITIONS) {
      const pos = scene.getSeasonPosition(sp.angle);
      tmpVec.copy(pos);
      const projected = tmpVec.project(camera);

      const visible = projected.z < 1;
      const x = (projected.x + 1) / 2 * containerRect.width;
      const y = (1 - projected.y) / 2 * containerRect.height;

      results.push({ label: sp.label, x, y, visible });
    }

    seasonLabels = results;
  }

  /** Called by the parent's animation loop */
  export function render() {
    if (!orreryScene || !controls) return;

    const time = get(currentTime);
    const solar = solarPosition(time, tilt);

    // Earth's ecliptic longitude is opposite the Sun's
    const earthAngle = solar.apparentLongitude + Math.PI;

    // Earth's daily rotation from GMST (sidereal time)
    const jd = julianDay(time);
    const earthRotation = greenwichMeanSiderealTime(jd) * DEG_TO_RAD;

    const tiltRad = tilt * DEG_TO_RAD;

    // update() positions Earth on orbit, sets tilt + rotation, and returns
    // the sun direction in the Earth mesh's local/object space.
    const sunDirLocal = orreryScene.update(earthAngle, earthRotation, tiltRad);

    // Update tilt-dependent grid lines when tilt changes
    if (tilt !== prevTilt) {
      updateSpecialLatitudes(orreryScene.grid, tilt);
      prevTilt = tilt;
    }

    // Update shader uniforms — sunDirection is geometric (Sun→Earth in local space)
    const mat = orreryScene.earthMaterial;
    mat.uniforms.uSunDirection.value.copy(sunDirLocal);
    mat.uniforms.uHardTerminator.value = hard ? 1.0 : 0.0;
    mat.uniforms.uShowNightLights.value = nightLights ? 1.0 : 0.0;
    const theme = getThemeById(themeId);
    mat.uniforms.uMapBrightness.value = theme.mapBrightness;

    // Subsolar point marker — use the local sun direction so it stays
    // on the correct spot of the rotating Earth mesh.
    updateSunMarkerGlobe(orreryScene.sunMarker, sunDirLocal, EARTH_RADIUS);
    orreryScene.sunMarker.visible = subsolar;

    // Location marker
    updateLocationMarkerGlobe(orreryScene.locationMarker, loc.lat, loc.lon, EARTH_RADIUS);

    // Grid visibility
    orreryScene.grid.majorLines.visible = majorGrid;
    orreryScene.grid.minorLines.visible = minorGrid;
    orreryScene.grid.equatorTropicsLines.visible = eqTropics;
    orreryScene.grid.arcticCircleLines.visible = arcticCirc;

    // Track Earth with camera
    const earthPos = orreryScene.getEarthPosition();
    updateOrreryTarget(controls, earthPos);
    controls.update();

    // Theme clear color
    orreryScene.renderer.setClearColor(theme.clearColor);
    orreryScene.renderer.render(orreryScene.scene, orreryScene.camera);

    // Update label positions after rendering
    updateSeasonLabels(orreryScene);
  }

  onMount(() => {
    orreryScene = createOrreryScene(container, sharedTexture, nightTexture);
    controls = createOrreryControls(orreryScene.camera, orreryScene.renderer.domElement);

    const rect = container.getBoundingClientRect();
    containerRect = { width: rect.width, height: rect.height };
    orreryScene.resize(rect.width, rect.height);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          containerRect = { width, height };
          orreryScene?.resize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      controls?.dispose();
      orreryScene?.dispose();
    };
  });
</script>

<div
  class="orrery-container"
  bind:this={container}
  role="application"
  aria-label="Solar system orrery view"
>
  <div class="orrery-labels">
    {#each seasonLabels as sl (sl.label)}
      {#if sl.visible}
        <span
          class="season-label"
          style="left: {sl.x}px; top: {sl.y}px;"
        >
          {sl.label}
        </span>
      {/if}
    {/each}
  </div>
</div>

<style>
  .orrery-container {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden;
  }

  .orrery-container :global(canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .orrery-labels {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
  }

  .season-label {
    position: absolute;
    transform: translate(-50%, -50%);
    white-space: nowrap;
    pointer-events: none;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: rgba(200, 200, 220, 0.85);
    text-shadow:
      0 0 4px rgba(0, 0, 0, 1),
      0 0 8px rgba(0, 0, 0, 0.9),
      0 1px 3px rgba(0, 0, 0, 1);
    line-height: 1;
  }
</style>

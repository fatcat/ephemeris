<script lang="ts">
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { get } from 'svelte/store';
  import { createSundialScene, type SundialScene } from '../three/sundialScene.js';
  import { currentTime } from '../stores/time.js';
  import { sunElevationAzimuth, sunriseSunset } from '../astronomy/solar.js';
  import {
    userLocation,
    currentThemeId,
    type UserLocation,
  } from '../stores/settings.js';
  import { getThemeById } from '../themes.js';

  let container: HTMLDivElement;
  let sundialScene: SundialScene | null = $state(null);

  let loc: UserLocation = $state({ name: '', lat: 0, lon: 0 });
  userLocation.subscribe((v) => (loc = v));

  let themeId = $state('charcoal');
  currentThemeId.subscribe((v) => (themeId = v));

  /**
   * Compute which integer hour offsets from noon (-6..+6) have sunlight.
   * Uses sunrise/sunset to determine the range.
   */
  function computeLitHours(date: Date, latDeg: number, lonDeg: number): SvelteSet<number> {
    const { sunrise, sunset, dayLength } = sunriseSunset(date, latDeg, lonDeg);
    const hours = new SvelteSet<number>();

    if (dayLength >= 24) {
      // Polar day: all hours lit
      for (let h = -6; h <= 6; h++) hours.add(h);
      return hours;
    }
    if (dayLength <= 0) {
      // Polar night: no hours lit
      return hours;
    }

    if (!sunrise || !sunset) return hours;

    // Compute solar noon in minutes from midnight UTC
    const { solarNoon } = sunriseSunset(date, latDeg, lonDeg);
    const noonMs = solarNoon.getTime();
    const sunriseMs = sunrise.getTime();
    const sunsetMs = sunset.getTime();

    // For each hour offset from solar noon, check if it falls within daylight
    for (let h = -6; h <= 6; h++) {
      const hourMs = noonMs + h * 3600000;
      if (hourMs >= sunriseMs && hourMs <= sunsetMs) {
        hours.add(h);
      }
    }

    // Always include the boundary hours if there's any daylight
    if (hours.size === 0 && dayLength > 0) {
      hours.add(0); // at least show noon
    }

    return hours;
  }

  let lowLatWarning = $derived(Math.abs(loc.lat) < 15);

  onMount(() => {
    sundialScene = createSundialScene(container);

    const rect = container.getBoundingClientRect();
    sundialScene.resize(rect.width, rect.height);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          sundialScene?.resize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    let frameId = 0;
    function loop() {
      frameId = requestAnimationFrame(loop);
      if (!sundialScene) return;

      const time = get(currentTime);
      const { elevation, azimuth } = sunElevationAzimuth(time, loc.lat, loc.lon);
      const litHours = computeLitHours(time, loc.lat, loc.lon);
      const theme = getThemeById(themeId);

      sundialScene.update(elevation, azimuth, loc.lat, litHours, theme.clearColor);
      sundialScene.renderer.render(sundialScene.scene, sundialScene.camera);
    }
    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      sundialScene?.dispose();
    };
  });
</script>

<div
  class="sundial-container"
  bind:this={container}
  role="application"
  aria-label="Sundial view"
>
  {#if lowLatWarning}
    <span class="low-lat-warning">
      Horizontal sundials are impractical at this latitude
    </span>
  {/if}
</div>

<style>
  .sundial-container {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden;
  }

  .sundial-container :global(canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .low-lat-warning {
    position: absolute;
    top: 0.5rem;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.75rem;
    font-style: normal;
    color: rgba(198, 198, 198, 0.7);
    pointer-events: none;
    z-index: 1;
    white-space: nowrap;
    text-shadow:
      0 0 4px rgba(0, 0, 0, 1),
      0 0 8px rgba(0, 0, 0, 0.9);
  }
</style>

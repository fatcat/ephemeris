<script lang="ts">
  import { onMount } from 'svelte';
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

  let loc: UserLocation = $derived($userLocation);

  let themeId = $derived($currentThemeId);

  /**
   * Compute which integer hour offsets from noon (-6..+6) have sunlight.
   * Uses sunrise/sunset to determine the range.
   */
  function computeLitHours(date: Date, latDeg: number, lonDeg: number): Set<number> {
    const { sunrise, sunset, dayLength, solarNoon } = sunriseSunset(date, latDeg, lonDeg);
    const hours = new Set<number>();

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
  class="scene-host"
  bind:this={container}
  role="application"
  aria-label="Sundial view"
>
  {#if lowLatWarning}
    <span class="view-note">
      Horizontal sundials are impractical at this latitude
    </span>
  {/if}
</div>

<style>

</style>

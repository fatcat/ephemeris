<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { createSkydomeScene, type SkydomeScene } from '../three/skydomeScene.js';
  import {
    SEASONAL_PATH_NAMES,
    seasonalPathLabel,
    type SeasonalPathId,
    type SeasonalPathInfo,
  } from '../astronomy/sunPath.js';
  import { PATH_COLORS, cssHex } from '../pathColors.js';
  import { currentTime } from '../stores/time.js';
  import { userLocation, currentThemeId, axialTilt } from '../stores/settings.js';
  import { getThemeById } from '../themes.js';

  let container: HTMLDivElement;

  let loc = $derived($userLocation);
  let themeId = $derived($currentThemeId);
  let tilt = $derived($axialTilt);

  let sunDown = $state(false);
  let pathInfo: Record<SeasonalPathId, SeasonalPathInfo> | null = $state.raw(null);

  let legend = $derived(
    pathInfo
      ? [
          ...(Object.keys(SEASONAL_PATH_NAMES) as SeasonalPathId[]).map((id) => ({
            name: seasonalPathLabel(id, pathInfo![id]),
            color: cssHex(PATH_COLORS[pathInfo![id].role]),
          })),
          { name: 'Today (solar hours)', color: cssHex(PATH_COLORS.today) },
        ]
      : [],
  );

  onMount(() => {
    const skydome: SkydomeScene = createSkydomeScene(container);

    const rect = container.getBoundingClientRect();
    skydome.resize(rect.width, rect.height);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) skydome.resize(width, height);
      }
    });
    resizeObserver.observe(container);

    let frameId = 0;
    function loop() {
      frameId = requestAnimationFrame(loop);
      const elevation = skydome.update({
        time: get(currentTime),
        latDeg: loc.lat,
        lonDeg: loc.lon,
        tiltDeg: tilt,
        theme: getThemeById(themeId),
      });
      sunDown = elevation <= 0;
      // Same object until the paths are rebuilt, so this rarely reassigns
      const info = skydome.seasonalInfo();
      if (info !== pathInfo) pathInfo = info;
      skydome.renderer.render(skydome.scene, skydome.camera);
    }
    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      skydome.dispose();
    };
  });
</script>

<div class="scene-host skydome-host" bind:this={container} role="application" aria-label="Sky dome view: the sun's path across the sky">
  {#if sunDown}
    <span class="view-note">The sun is below the horizon</span>
  {/if}
  <ul class="skydome-legend" aria-label="Sun path key">
    {#each legend as item (item.name)}
      <li><span class="swatch" style="background: {item.color}"></span>{item.name}</li>
    {/each}
  </ul>
</div>

<style>
  .skydome-host {
    container-type: size;
  }

  /* Too small for a key without covering the dome */
  @container (max-width: 480px) or (max-height: 320px) {
    .skydome-legend {
      display: none;
    }
  }

  .skydome-legend {
    position: absolute;
    left: 0.6rem;
    bottom: 0.6rem;
    z-index: 1;
    list-style: none;
    padding: 0.35rem 0.5rem;
    border-radius: 6px;
    background: var(--color-overlay-bg);
    color: var(--color-text);
    font-size: 0.65rem;
    pointer-events: none;
  }

  .skydome-legend li {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    line-height: 1.5;
  }

  .swatch {
    width: 0.9rem;
    height: 0.25rem;
    border-radius: 2px;
  }
</style>

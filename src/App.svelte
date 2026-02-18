<script lang="ts">
  import { onMount } from 'svelte';
  import type { Texture } from 'three';
  import Globe from './lib/components/Globe.svelte';
  import Projection from './lib/components/Projection.svelte';
  import Orrery from './lib/components/Orrery.svelte';
  import SettingsPanel from './lib/components/SettingsPanel.svelte';
  import SunInfo from './lib/components/SunInfo.svelte';
  import { loadEarthTexture, loadNightTexture } from './lib/three/scene.js';
  import { tick, playbackMode, isPlaying, playbackSpeed } from './lib/stores/time.js';
  import { showGlobe, showProjection, showOrrery, showSunInfo, showSettingsPanel } from './lib/stores/settings.js';

  let sharedTexture: Texture | null = $state(null);
  let nightTexture: Texture | null = $state(null);
  let globeRef: Globe | undefined = $state();
  let animationId = 0;
  let lastFrameTime = 0;
  let errorMessage: string | null = $state(null);
  let sunInfoVisible = $state(true);
  let panelVisible = $state(true);

  let globeVisible = $state(true);
  let projVisible = $state(true);
  let orreryVisible = $state(false);
  showGlobe.subscribe((v) => (globeVisible = v));
  showProjection.subscribe((v) => (projVisible = v));
  showOrrery.subscribe((v) => (orreryVisible = v));
  showSunInfo.subscribe((v) => (sunInfoVisible = v));
  showSettingsPanel.subscribe((v) => (panelVisible = v));

  // Collect active views as an ordered list for layout
  let activeViews = $derived(
    (['globe', 'projection', 'orrery'] as const).filter(
      (v) => v === 'globe' ? globeVisible : v === 'projection' ? projVisible : orreryVisible,
    ),
  );

  // Split ratios: flex proportions for each view section.
  // splitRatios[i] is the flex weight of view i. Sum = 1.
  // Reset to equal splits when the view count changes.
  let splitRatios = $state([0.5, 0.5]);
  let prevViewCount = 2;

  $effect(() => {
    const n = activeViews.length;
    if (n !== prevViewCount) {
      splitRatios = Array(n).fill(1 / n);
      prevViewCount = n;
    }
  });

  // Split handle dragging
  let viewsColumnEl: HTMLElement = $state(undefined as unknown as HTMLElement);
  let draggingHandle = $state(-1); // index of the handle being dragged (-1 = none)

  function onSplitPointerDown(index: number, e: PointerEvent) {
    draggingHandle = index;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onSplitPointerMove(e: PointerEvent) {
    if (draggingHandle < 0 || !viewsColumnEl) return;
    const rect = viewsColumnEl.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const ratio = y / rect.height;

    // Compute where the handle should split: handle i sits between view i and i+1.
    // Sum of ratios for views 0..i = ratio, and views i+1..n = 1 - ratio.
    const n = splitRatios.length;
    const minFlex = 0.15; // minimum proportion per view

    // Sum of ratios before the handle
    let before = Math.max(minFlex * (draggingHandle + 1), Math.min(1 - minFlex * (n - draggingHandle - 1), ratio));
    // Distribute evenly among views before and after the handle
    const newRatios = [...splitRatios];
    const beforeCount = draggingHandle + 1;
    const afterCount = n - beforeCount;
    const perBefore = before / beforeCount;
    const perAfter = (1 - before) / afterCount;

    for (let i = 0; i < beforeCount; i++) newRatios[i] = perBefore;
    for (let i = beforeCount; i < n; i++) newRatios[i] = perAfter;
    splitRatios = newRatios;
  }

  function onSplitPointerUp() {
    draggingHandle = -1;
  }

  function hasWebGL(): boolean {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch { return false; }
  }

  // Time-advancement loop. Each view component drives its own rAF render
  // loop internally (started in its onMount), so the parent only handles
  // time progression — no cross-component $state refs needed.
  function advanceTime(now: number) {
    animationId = requestAnimationFrame(advanceTime);
    const deltaSec = Math.min((now - lastFrameTime) / 1000, 0.1);
    lastFrameTime = now;
    tick(deltaSec);
  }

  onMount(() => {
    if (!hasWebGL()) {
      errorMessage = 'This app requires WebGL. Please use a modern browser.';
      return;
    }

    let disposed = false;

    Promise.all([loadEarthTexture(), loadNightTexture()]).then(([dayTex, nightTex]) => {
      if (disposed) { dayTex.dispose(); nightTex.dispose(); return; }
      sharedTexture = dayTex;
      nightTexture = nightTex;

      lastFrameTime = performance.now();
      animationId = requestAnimationFrame(advanceTime);

      // Brute-force kick: switch from realtime to smooth mode after a
      // short delay so the Three.js views start animating immediately.
      // Mirrors the manual "pause → play" workaround.
      setTimeout(() => {
        playbackMode.set('smooth');
        playbackSpeed.set(1);
        isPlaying.set(true);
      }, 100);
    }).catch(() => {
      errorMessage = 'Failed to load Earth textures. Please reload the page.';
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(animationId);
      sharedTexture?.dispose();
      nightTexture?.dispose();
    };
  });
</script>

{#if errorMessage}
  <div class="error-screen" role="alert">
    <p>{errorMessage}</p>
  </div>
{:else}
<div class="app-layout">
  <main class="views-column" bind:this={viewsColumnEl}>
    {#if sunInfoVisible}
      <div class="sun-info-bar">
        <SunInfo />
      </div>
    {/if}
    {#if sharedTexture && nightTexture}
      {#each activeViews as view, i (view)}
        {#if i > 0}
          <div
            class="split-handle"
            role="separator"
            aria-label="Resize views"
            onpointerdown={(e) => onSplitPointerDown(i - 1, e)}
            onpointermove={onSplitPointerMove}
            onpointerup={onSplitPointerUp}
            onpointercancel={onSplitPointerUp}
          ></div>
        {/if}
        <section class="view-cell" style="flex: {splitRatios[i] ?? 1}">
          {#if view === 'globe'}
            <Globe bind:this={globeRef} {sharedTexture} {nightTexture} />
            <button
              class="reset-view-btn"
              onclick={() => globeRef?.resetView()}
              aria-label="Reset globe view to saved location"
              title="Reset view"
            >&#8962;</button>
          {:else if view === 'projection'}
            <Projection {sharedTexture} {nightTexture} />
          {:else if view === 'orrery'}
            <Orrery {sharedTexture} {nightTexture} />
          {/if}
        </section>
      {/each}
    {/if}
  </main>
  <button
    class="panel-toggle"
    onclick={() => showSettingsPanel.set(!panelVisible)}
    aria-label={panelVisible ? 'Hide settings panel' : 'Show settings panel'}
    title={panelVisible ? 'Hide settings' : 'Show settings'}
  >
    {panelVisible ? '\u203A' : '\u2039'}
  </button>
  {#if panelVisible}
    <aside class="settings-aside">
      <SettingsPanel />
    </aside>
  {/if}
</div>
{/if}

<style>
  .error-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
    text-align: center;
    color: var(--color-text-muted);
    font-size: 1.1rem;
  }

  .app-layout {
    display: flex;
    flex-direction: row;
    height: 100%;
  }

  .views-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  .view-cell {
    flex: 1;
    display: flex;
    min-height: 0;
    min-width: 0;
    position: relative;
    overflow: hidden;
  }

  .split-handle {
    flex-shrink: 0;
    height: 6px;
    background: var(--color-border);
    cursor: row-resize;
    position: relative;
    touch-action: none;
  }

  .split-handle::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 2rem;
    height: 3px;
    border-radius: 2px;
    background: var(--color-text-muted);
    opacity: 0.5;
  }

  .split-handle:hover,
  .split-handle:active {
    background: var(--color-accent);
  }

  .split-handle:hover::after,
  .split-handle:active::after {
    opacity: 0.8;
  }

  .sun-info-bar {
    flex-shrink: 0;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    padding: 0.3rem 0.8rem;
    overflow: hidden;
  }

  .reset-view-btn {
    position: absolute;
    bottom: 0.6rem;
    right: 0.6rem;
    z-index: 2;
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-overlay-bg);
    color: var(--color-text-muted);
    font-size: 1.1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.15s, color 0.15s;
  }

  .reset-view-btn:hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .panel-toggle {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.2rem;
    border: none;
    border-left: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-muted);
    font-size: 1.1rem;
    cursor: pointer;
    transition: color 0.15s, background-color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .panel-toggle:hover {
    color: var(--color-accent);
    background: rgba(255, 255, 255, 0.05);
  }

  .settings-aside {
    flex-shrink: 0;
    width: 18rem;
    border-left: 1px solid var(--color-border);
    overflow-y: auto;
    background: var(--color-surface);
  }

  @media (max-width: 768px) {
    .app-layout {
      flex-direction: column;
    }

    .views-column {
      flex: 1;
      min-height: 40vh;
    }

    .settings-aside {
      width: 100%;
      border-left: none;
      border-top: 1px solid var(--color-border);
      max-height: 60vh;
      overflow-y: auto;
    }
  }
</style>

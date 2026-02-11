<script lang="ts">
  import { onMount } from 'svelte';
  import type { Texture } from 'three';
  import Globe from './lib/components/Globe.svelte';
  import Projection from './lib/components/Projection.svelte';
  import SettingsPanel from './lib/components/SettingsPanel.svelte';
  import SunInfo from './lib/components/SunInfo.svelte';
  import { loadEarthTexture, loadNightTexture } from './lib/three/scene.js';
  import { tick } from './lib/stores/time.js';
  import { viewMode, showSunInfo, type ViewMode } from './lib/stores/settings.js';

  let sharedTexture: Texture | null = $state(null);
  let nightTexture: Texture | null = $state(null);
  let globeRef: Globe | undefined = $state();
  let projRef: Projection | undefined = $state();
  let animationId = 0;
  let lastFrameTime = 0;
  let currentViewMode: ViewMode = $state('both');
  let errorMessage: string | null = $state(null);
  let splitRatio = $state(0.5);
  let isDraggingSplit = $state(false);
  let viewsColumnEl: HTMLElement = $state(undefined as unknown as HTMLElement);
  let sunInfoVisible = $state(true);
  viewMode.subscribe((v) => (currentViewMode = v));
  showSunInfo.subscribe((v) => (sunInfoVisible = v));

  function onSplitPointerDown(e: PointerEvent) {
    isDraggingSplit = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onSplitPointerMove(e: PointerEvent) {
    if (!isDraggingSplit || !viewsColumnEl) return;
    const rect = viewsColumnEl.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const ratio = Math.max(0.33, Math.min(0.67, y / rect.height));
    splitRatio = ratio;
  }

  function onSplitPointerUp() {
    isDraggingSplit = false;
  }

  function hasWebGL(): boolean {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch { return false; }
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
      function animate(now: number) {
        animationId = requestAnimationFrame(animate);
        const deltaSec = Math.min((now - lastFrameTime) / 1000, 0.1);
        lastFrameTime = now;
        tick(deltaSec);
        globeRef?.render();
        projRef?.render();
      }
      animationId = requestAnimationFrame(animate);
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
    {#if sharedTexture && nightTexture}
      {#if currentViewMode === 'globe' || currentViewMode === 'both'}
        <section class="globe-section" style={currentViewMode === 'both' ? `flex: ${splitRatio}` : ''}>
          <Globe bind:this={globeRef} {sharedTexture} {nightTexture} />
          {#if sunInfoVisible}
            <div class="sun-info-overlay">
              <SunInfo />
            </div>
          {/if}
          <button
            class="reset-view-btn"
            onclick={() => globeRef?.resetView()}
            aria-label="Reset globe view to saved location"
            title="Reset view"
          >&#8962;</button>
        </section>
      {/if}
      {#if currentViewMode === 'both'}
        <div
          class="split-handle"
          role="separator"
          aria-label="Resize globe and projection"
          onpointerdown={onSplitPointerDown}
          onpointermove={onSplitPointerMove}
          onpointerup={onSplitPointerUp}
          onpointercancel={onSplitPointerUp}
        ></div>
      {/if}
      {#if currentViewMode === 'projection' || currentViewMode === 'both'}
        <section class="projection-section" style={currentViewMode === 'both' ? `flex: ${1 - splitRatio}` : ''}>
          <Projection bind:this={projRef} {sharedTexture} {nightTexture} />
        </section>
      {/if}
    {/if}
  </main>
  <aside class="settings-aside">
    <SettingsPanel />
  </aside>
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

  .globe-section {
    flex: 1;
    display: flex;
    min-height: 0;
    min-width: 0;
    position: relative;
  }

  .sun-info-overlay {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 2;
    background: var(--color-overlay-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.4rem 0.6rem;
    max-width: 14rem;
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

  .projection-section {
    flex: 1;
    display: flex;
    min-height: 0;
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

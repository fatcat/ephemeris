<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import type { Texture } from 'three';
  import Globe from './lib/components/Globe.svelte';
  import Projection from './lib/components/Projection.svelte';
  import Orrery from './lib/components/Orrery.svelte';
  import Sundial from './lib/components/Sundial.svelte';
  import SettingsPanel from './lib/components/SettingsPanel.svelte';
  import SunInfo from './lib/components/SunInfo.svelte';
  import { loadEarthTexture, loadNightTexture } from './lib/three/scene.js';
  import { tick, playbackMode, isPlaying, playbackSpeed } from './lib/stores/time.js';
  import { showGlobe, showProjection, showOrrery, showSundial, showSunInfo, showSettingsPanel } from './lib/stores/settings.js';

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
  let sundialVisible = $state(false);
  showGlobe.subscribe((v) => (globeVisible = v));
  showProjection.subscribe((v) => (projVisible = v));
  showOrrery.subscribe((v) => (orreryVisible = v));
  showSundial.subscribe((v) => (sundialVisible = v));
  showSunInfo.subscribe((v) => (sunInfoVisible = v));
  showSettingsPanel.subscribe((v) => (panelVisible = v));

  // Canonical order of views (used to determine which are active)
  let activeViews = $derived(
    (['globe', 'projection', 'orrery', 'sundial'] as const).filter(
      (v) =>
        v === 'globe' ? globeVisible :
        v === 'projection' ? projVisible :
        v === 'orrery' ? orreryVisible :
        sundialVisible,
    ),
  );

  // Display order — a permutation of activeViews.
  // Preserved across add/remove; mutated by promotion (3-view).
  let displayOrder = $state<string[]>([]);
  let rowSplit = $state(0.5); // proportion of height for the top row/view
  let colSplit = $state(0.5); // proportion of width for the left column

  $effect(() => {
    const active = activeViews as readonly string[];
    const current = untrack(() => displayOrder);
    const kept = current.filter((v) => active.includes(v));
    const added = active.filter((v) => !kept.includes(v));
    const next = [...kept, ...added];
    if (next.length !== current.length) {
      rowSplit = 0.5;
      colSplit = 0.5;
    }
    displayOrder = next;
  });

  // Promotion: swap displayOrder[index] with displayOrder[0].
  // Called only from the promote-frame edge strips (not from the view cell itself),
  // so no canvas/button filtering is needed.
  function tryPromote(index: number, e: MouseEvent) {
    e.stopPropagation();
    const next = [...displayOrder];
    [next[0], next[index]] = [next[index], next[0]];
    displayOrder = next;
  }

  // ── Drag handles ──────────────────────────────────────────────────────────
  let viewAreaEl: HTMLElement = $state(undefined as unknown as HTMLElement);
  let bottomRowEl: HTMLElement | null = $state(null);
  let draggingH = $state(false);
  let draggingV = $state(false);

  function onHPointerDown(e: PointerEvent) {
    draggingH = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onHPointerMove(e: PointerEvent) {
    if (!draggingH || !viewAreaEl) return;
    const rect = viewAreaEl.getBoundingClientRect();
    rowSplit = Math.max(0.15, Math.min(0.85, (e.clientY - rect.top) / rect.height));
  }
  function onHPointerUp() { draggingH = false; }

  function onVPointerDown(e: PointerEvent) {
    draggingV = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onVPointerMove(e: PointerEvent) {
    if (!draggingV) return;
    // bottomRowEl in 3-view; viewAreaEl in 4-view (same width either way)
    const refEl = bottomRowEl ?? viewAreaEl;
    if (!refEl) return;
    const rect = refEl.getBoundingClientRect();
    colSplit = Math.max(0.15, Math.min(0.85, (e.clientX - rect.left) / rect.width));
  }
  function onVPointerUp() { draggingV = false; }

  function hasWebGL(): boolean {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch { return false; }
  }

  // Time-advancement loop. Each view component drives its own rAF render loop.
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

{#snippet promoteFrame(index: number)}
  <!--
    Thin clickable frame around the small view. Each strip covers one edge;
    the center is left uncovered so canvas interactions pass through normally.
    z-index keeps the strips above the Three.js canvas.
  -->
  <div class="promote-frame" aria-hidden="true">
    <button class="pf-edge pf-top"    onclick={(e) => tryPromote(index, e)} tabindex="-1" aria-label="Promote view"></button>
    <button class="pf-edge pf-bottom" onclick={(e) => tryPromote(index, e)} tabindex="-1" aria-label="Promote view"></button>
    <button class="pf-edge pf-left"   onclick={(e) => tryPromote(index, e)} tabindex="-1" aria-label="Promote view"></button>
    <button class="pf-edge pf-right"  onclick={(e) => tryPromote(index, e)} tabindex="-1" aria-label="Promote view"></button>
  </div>
{/snippet}

{#snippet cellContent(view: string)}
  {#if view === 'globe'}
    <Globe bind:this={globeRef} sharedTexture={sharedTexture!} nightTexture={nightTexture!} />
    <button
      class="reset-view-btn"
      onclick={() => globeRef?.resetView()}
      aria-label="Reset globe view to saved location"
      title="Reset view"
    >&#8962;</button>
  {:else if view === 'projection'}
    <Projection sharedTexture={sharedTexture!} nightTexture={nightTexture!} />
  {:else if view === 'orrery'}
    <Orrery sharedTexture={sharedTexture!} nightTexture={nightTexture!} />
  {:else if view === 'sundial'}
    <Sundial />
  {/if}
{/snippet}

{#if errorMessage}
  <div class="error-screen" role="alert">
    <p>{errorMessage}</p>
  </div>
{:else}
<div class="app-layout">
  <main class="views-column">
    {#if sunInfoVisible}
      <div class="sun-info-bar">
        <SunInfo />
      </div>
    {/if}
    {#if sharedTexture && nightTexture}
      <div class="view-area" bind:this={viewAreaEl}>

        {#if displayOrder.length === 1}
          <!-- ── 1 view: full area ── -->
          <section class="view-cell">
            {@render cellContent(displayOrder[0])}
          </section>

        {:else if displayOrder.length === 2}
          <!-- ── 2 views: vertical stack ── -->
          <section class="view-cell" style="flex: {rowSplit}">
            {@render cellContent(displayOrder[0])}
          </section>
          <div
            class="split-handle split-handle--h"
            role="separator"
            aria-label="Resize views"
            onpointerdown={onHPointerDown}
            onpointermove={onHPointerMove}
            onpointerup={onHPointerUp}
            onpointercancel={onHPointerUp}
          ></div>
          <section class="view-cell" style="flex: {1 - rowSplit}">
            {@render cellContent(displayOrder[1])}
          </section>

        {:else if displayOrder.length === 3}
          <!-- ── 3 views: 1 large top + 2 small below ── -->
          <section class="view-cell" style="flex: {rowSplit}">
            {@render cellContent(displayOrder[0])}
          </section>
          <div
            class="split-handle split-handle--h"
            role="separator"
            aria-label="Resize views"
            onpointerdown={onHPointerDown}
            onpointermove={onHPointerMove}
            onpointerup={onHPointerUp}
            onpointercancel={onHPointerUp}
          ></div>
          <div class="view-row" style="flex: {1 - rowSplit}" bind:this={bottomRowEl}>
            <div class="view-cell view-cell--small" style="flex: {colSplit}">
              {@render promoteFrame(1)}
              {@render cellContent(displayOrder[1])}
            </div>
            <div
              class="split-handle split-handle--v"
              role="separator"
              aria-label="Resize views"
              onpointerdown={onVPointerDown}
              onpointermove={onVPointerMove}
              onpointerup={onVPointerUp}
              onpointercancel={onVPointerUp}
            ></div>
            <div class="view-cell view-cell--small" style="flex: {1 - colSplit}">
              {@render promoteFrame(2)}
              {@render cellContent(displayOrder[2])}
            </div>
          </div>

        {:else if displayOrder.length === 4}
          <!-- ── 4 views: 2×2 grid ── -->
          <div class="view-row" style="flex: {rowSplit}">
            <section class="view-cell" style="flex: {colSplit}">
              {@render cellContent(displayOrder[0])}
            </section>
            <div
              class="split-handle split-handle--v"
              role="separator"
              aria-label="Resize views"
              onpointerdown={onVPointerDown}
              onpointermove={onVPointerMove}
              onpointerup={onVPointerUp}
              onpointercancel={onVPointerUp}
            ></div>
            <section class="view-cell" style="flex: {1 - colSplit}">
              {@render cellContent(displayOrder[1])}
            </section>
          </div>
          <div
            class="split-handle split-handle--h"
            role="separator"
            aria-label="Resize views"
            onpointerdown={onHPointerDown}
            onpointermove={onHPointerMove}
            onpointerup={onHPointerUp}
            onpointercancel={onHPointerUp}
          ></div>
          <div class="view-row" style="flex: {1 - rowSplit}">
            <section class="view-cell" style="flex: {colSplit}">
              {@render cellContent(displayOrder[2])}
            </section>
            <div
              class="split-handle split-handle--v"
              role="separator"
              aria-label="Resize views"
              onpointerdown={onVPointerDown}
              onpointermove={onVPointerMove}
              onpointerup={onVPointerUp}
              onpointercancel={onVPointerUp}
            ></div>
            <section class="view-cell" style="flex: {1 - colSplit}">
              {@render cellContent(displayOrder[3])}
            </section>
          </div>
        {/if}

      </div>
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

  .view-area {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .view-row {
    display: flex;
    flex-direction: row;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .view-cell {
    flex: 1;
    display: flex;
    min-height: 0;
    min-width: 0;
    position: relative;
    overflow: hidden;
  }

  /* Promotable small views (3-view layout) */
  .view-cell--small {
    cursor: default;
  }

  /* Promotion frame: four thin edge strips that sit above the canvas.
     The center gap is intentionally uncovered so canvas interactions pass through. */
  .promote-frame {
    position: absolute;
    inset: 0;
    z-index: 100;
    pointer-events: none; /* the frame itself is transparent to clicks */
  }

  .pf-edge {
    position: absolute;
    background: transparent;
    border: none;
    padding: 0;
    pointer-events: auto;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .pf-edge:hover {
    background: var(--color-accent);
    opacity: 0.25;
  }

  .pf-top    { top: 0;    left: 0;    right: 0;   height: 10px; }
  .pf-bottom { bottom: 0; left: 0;    right: 0;   height: 10px; }
  .pf-left   { top: 10px; bottom: 10px; left: 0;  width: 10px;  }
  .pf-right  { top: 10px; bottom: 10px; right: 0; width: 10px;  }

  /* Split handles */
  .split-handle {
    flex-shrink: 0;
    background: var(--color-border);
    position: relative;
    touch-action: none;
  }

  .split-handle--h {
    height: 6px;
    cursor: row-resize;
  }

  .split-handle--v {
    width: 6px;
    cursor: col-resize;
  }

  .split-handle::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    border-radius: 2px;
    background: var(--color-text-muted);
    opacity: 0.5;
  }

  .split-handle--h::after {
    width: 2rem;
    height: 3px;
  }

  .split-handle--v::after {
    width: 3px;
    height: 2rem;
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

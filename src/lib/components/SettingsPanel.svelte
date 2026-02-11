<script lang="ts">
  import TimeDisplay from './TimeDisplay.svelte';
  import Calendar from './Calendar.svelte';
  import Presets from './Presets.svelte';
  import Controls from './Controls.svelte';
  import LocationInput from './LocationInput.svelte';
  import SettingsPopover from './SettingsPopover.svelte';
  import {
    hardTerminator,
    viewMode,
    cameraLatitude,
    userLocation,
    type ViewMode,
    type UserLocation,
  } from '../stores/settings.js';

  let hard = $state(false);
  let currentViewMode: ViewMode = $state('both');
  let camLat = $state(0);
  let loc: UserLocation = $state({ name: '', lat: 0, lon: 0 });
  let gearOpen = $state(false);
  let gearBtnEl: HTMLButtonElement = $state(undefined as unknown as HTMLButtonElement);

  hardTerminator.subscribe((v) => (hard = v));
  viewMode.subscribe((v) => (currentViewMode = v));
  cameraLatitude.subscribe((v) => (camLat = v));
  userLocation.subscribe((v) => (loc = v));

  function setViewMode(mode: ViewMode) {
    viewMode.set(mode);
  }
</script>

<div class="panel">
  <div class="panel-header">
    <h1 class="panel-title">Ephemeris</h1>
    <button
      class="gear-btn"
      class:active={gearOpen}
      bind:this={gearBtnEl}
      onclick={() => (gearOpen = !gearOpen)}
      aria-label="Settings"
      aria-expanded={gearOpen}
    >
      <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path d="M11.078 0l.294 2.18a7.725 7.725 0 011.85.764l1.681-1.395 1.548 1.548-1.395 1.68c.334.576.59 1.196.764 1.851L18 6.922v2.156l-2.18.294a7.725 7.725 0 01-.764 1.85l1.395 1.681-1.548 1.548-1.68-1.395a7.725 7.725 0 01-1.851.764L11.078 16H8.922l-.294-2.18a7.725 7.725 0 01-1.85-.764l-1.681 1.395-1.548-1.548 1.395-1.68a7.725 7.725 0 01-.764-1.851L2 9.078V6.922l2.18-.294a7.725 7.725 0 01.764-1.85L3.549 3.097 5.097 1.55l1.68 1.395a7.725 7.725 0 011.851-.764L8.922 0h2.156zM10 6a2 2 0 100 4 2 2 0 000-4z" transform="translate(0 2)"/>
      </svg>
    </button>
    {#if gearOpen}
      <SettingsPopover onclose={() => (gearOpen = false)} {gearBtnEl} />
    {/if}
  </div>

  <div class="panel-section">
    <TimeDisplay />
  </div>

  <div class="panel-section">
    <Calendar />
  </div>

  <div class="panel-section">
    <Presets />
  </div>

  <div class="panel-divider">
    <span class="divider-label">Time Controls</span>
  </div>

  <div class="panel-section">
    <Controls />
  </div>

  <div class="panel-divider">
    <span class="divider-label">Display Controls</span>
  </div>

  <div class="panel-section view-terminator-row">
    <div class="labeled-group">
      <span class="group-label">Display</span>
      <div class="view-toggle" role="group" aria-label="View mode">
        <button
          class="btn btn-vt"
          class:active={currentViewMode === 'globe'}
          onclick={() => setViewMode('globe')}
          aria-label="Show globe only"
        >
          Globe
        </button>
        <button
          class="btn btn-vt"
          class:active={currentViewMode === 'both'}
          onclick={() => setViewMode('both')}
          aria-label="Show globe and projection"
        >
          Both
        </button>
        <button
          class="btn btn-vt"
          class:active={currentViewMode === 'projection'}
          onclick={() => setViewMode('projection')}
          aria-label="Show projection only"
        >
          Proj
        </button>
      </div>
    </div>
    <div class="labeled-group">
      <span class="group-label">Terminator</span>
      <div class="terminator-toggle" role="group" aria-label="Terminator style">
        <button
          class="btn btn-vt"
          class:active={!hard}
          onclick={() => hardTerminator.set(false)}
          aria-label="Soft terminator with twilight gradient"
        >
          Soft
        </button>
        <button
          class="btn btn-vt"
          class:active={hard}
          onclick={() => hardTerminator.set(true)}
          aria-label="Hard terminator with sharp edge"
        >
          Hard
        </button>
      </div>
    </div>
  </div>

  <div class="panel-section">
    <div class="labeled-group">
      <span class="group-label">Camera</span>
      <div
        class="view-toggle"
        role="group"
        aria-label="Camera viewing latitude"
      >
        <button
          class="btn btn-vt"
          class:active={camLat === -23.44}
          onclick={() => cameraLatitude.set(-23.44)}
          aria-label="View from Tropic of Capricorn"
        >
          Capri
        </button>
        <button
          class="btn btn-vt"
          class:active={camLat === 0}
          onclick={() => cameraLatitude.set(0)}
          aria-label="View from equator"
        >
          Equator
        </button>
        <button
          class="btn btn-vt"
          class:active={camLat === 23.44}
          onclick={() => cameraLatitude.set(23.44)}
          aria-label="View from Tropic of Cancer"
        >
          Cancer
        </button>
        <button
          class="btn btn-vt"
          class:active={camLat === loc.lat &&
            camLat !== -23.44 &&
            camLat !== 0 &&
            camLat !== 23.44}
          onclick={() => cameraLatitude.set(loc.lat)}
          aria-label="View from home location"
        >
          Home
        </button>
      </div>
    </div>
  </div>

  <div class="panel-divider">
    <span class="divider-label">Location</span>
  </div>

  <div class="panel-section">
    <LocationInput />
  </div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .panel-header {
    display: flex;
    align-items: center;
    padding: 0.6rem 0.8rem;
    border-bottom: 1px solid var(--color-border);
    position: relative;
  }

  .panel-title {
    flex: 1;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--color-text);
  }

  .gear-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    border-radius: 6px;
    background: none;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: color 0.15s, background-color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .gear-btn:hover {
    color: var(--color-accent);
    background: rgba(255, 255, 255, 0.05);
  }

  .gear-btn.active {
    color: var(--color-accent);
  }

  .panel-section {
    padding: 0.5rem 0.8rem;
  }

  .panel-divider {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0.8rem;
    margin: 0.2rem 0;
  }

  .divider-label {
    font-size: 0.6rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    white-space: nowrap;
  }

  .panel-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--color-border);
  }

  .view-terminator-row {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
  }

  .labeled-group {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .group-label {
    font-size: 0.55rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .view-toggle,
  .terminator-toggle {
    display: flex;
    gap: 1px;
  }

  .btn {
    background: var(--color-bg);
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    cursor: pointer;
    transition:
      background-color 0.15s,
      color 0.15s;
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  .btn:hover {
    color: var(--color-text);
    border-color: var(--color-text-muted);
  }

  .btn.active {
    background: var(--color-accent);
    color: var(--color-bg);
    border-color: var(--color-accent);
  }

  .btn-vt {
    padding: 0.3rem 0.45rem;
    font-size: 0.65rem;
  }

  .view-toggle .btn:first-child,
  .terminator-toggle .btn:first-child {
    border-radius: 6px 0 0 6px;
  }

  .view-toggle .btn:last-child,
  .terminator-toggle .btn:last-child {
    border-radius: 0 6px 6px 0;
  }

  .view-toggle .btn:not(:first-child):not(:last-child) {
    border-radius: 0;
  }
</style>

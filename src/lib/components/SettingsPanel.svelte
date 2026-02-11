<script lang="ts">
  import TimeDisplay from "./TimeDisplay.svelte";
  import Calendar from "./Calendar.svelte";
  import Presets from "./Presets.svelte";
  import Controls from "./Controls.svelte";
  import LocationInput from "./LocationInput.svelte";
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
    showSunInfo,
    useLocalTime,
    viewMode,
    cameraLatitude,
    userLocation,
    axialTilt,
    REAL_AXIAL_TILT,
    type ViewMode,
    type UserLocation,
  } from "../stores/settings.js";

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
  let sunInfo = $state(true);
  let localTime = $state(false);
  let currentViewMode: ViewMode = $state("both");
  let camLat = $state(0);
  let loc: UserLocation = $state({ name: "", lat: 0, lon: 0 });
  let tilt = $state(REAL_AXIAL_TILT);
  let settingsOpen = $state(false);

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
  showSunInfo.subscribe((v) => (sunInfo = v));
  useLocalTime.subscribe((v) => (localTime = v));
  viewMode.subscribe((v) => (currentViewMode = v));
  cameraLatitude.subscribe((v) => (camLat = v));
  userLocation.subscribe((v) => (loc = v));
  axialTilt.subscribe((v) => (tilt = v));

  // Info popup state
  let openInfo: string | null = $state(null);

  function toggleInfo(id: string) {
    openInfo = openInfo === id ? null : id;
  }

  function setViewMode(mode: ViewMode) {
    viewMode.set(mode);
  }

  let infoContent = $derived({
    axialTilt: {
      text: `Axial tilt (obliquity) is the angle between a planet\u2019s rotational axis and its orbital plane. Earth\u2019s tilt of 23.44\u00B0 causes the seasons. Drag the slider to see how different tilts would change day length and the position of the tropics and polar circles.`,
      url: "https://en.wikipedia.org/wiki/Axial_tilt",
      urlLabel: "Axial tilt on Wikipedia",
    },
    equatorTropics: {
      text: `The equator (0\u00B0) is equidistant from both poles. The tropics mark the northernmost (${tilt.toFixed(1)}\u00B0N) and southernmost (${tilt.toFixed(1)}\u00B0S) latitudes where the sun can appear directly overhead.`,
      url: "https://en.wikipedia.org/wiki/Tropics",
      urlLabel: "Tropics on Wikipedia",
    },
    arcticCircles: {
      text: `The polar circles (${(90 - tilt).toFixed(1)}\u00B0N/S) mark the boundary where 24-hour daylight or darkness occurs at least once per year.`,
      url: "https://en.wikipedia.org/wiki/Arctic_Circle",
      urlLabel: "Arctic Circle on Wikipedia",
    },
    subsolarPoint: {
      text: "The subsolar point is the location on Earth where the sun is directly overhead (at zenith) at any given moment.",
      url: "https://en.wikipedia.org/wiki/Subsolar_point",
      urlLabel: "Subsolar point on Wikipedia",
    },
  });
</script>

<div class="panel">
  <div class="panel-header">
    <h1 class="panel-title">Ephemeris</h1>
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
          class:active={currentViewMode === "globe"}
          onclick={() => setViewMode("globe")}
          aria-label="Show globe only"
        >
          Globe
        </button>
        <button
          class="btn btn-vt"
          class:active={currentViewMode === "both"}
          onclick={() => setViewMode("both")}
          aria-label="Show globe and projection"
        >
          Both
        </button>
        <button
          class="btn btn-vt"
          class:active={currentViewMode === "projection"}
          onclick={() => setViewMode("projection")}
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

  <button
    class="panel-divider panel-divider-btn"
    onclick={() => (settingsOpen = !settingsOpen)}
    aria-expanded={settingsOpen}
  >
    <span class="divider-chevron" class:open={settingsOpen}>&#9656;</span>
    <span class="divider-label">Settings</span>
  </button>

  {#if settingsOpen}
    <div class="panel-section toggles">
      <label class="toggle-row">
        <input
          type="checkbox"
          checked={localTime}
          onchange={() => useLocalTime.set(!localTime)}
        />
        <span>Use Local Time</span>
      </label>

      <label class="toggle-row">
        <input
          type="checkbox"
          checked={majorGrid}
          onchange={() => showMajorGrid.set(!majorGrid)}
        />
        <span>Major Grid Lines</span>
      </label>

      <label class="toggle-row">
        <input
          type="checkbox"
          checked={minorGrid}
          onchange={() => showMinorGrid.set(!minorGrid)}
        />
        <span>Minor Grid Lines</span>
      </label>

      <label class="toggle-row">
        <input
          type="checkbox"
          checked={continentLabels}
          onchange={() => showContinentLabels.set(!continentLabels)}
        />
        <span>Continent Names</span>
      </label>

      <label class="toggle-row">
        <input
          type="checkbox"
          checked={oceanLabels}
          onchange={() => showOceanLabels.set(!oceanLabels)}
        />
        <span>Ocean Names</span>
      </label>

      <label class="toggle-row">
        <input
          type="checkbox"
          checked={nightLights}
          onchange={() => showNightLights.set(!nightLights)}
        />
        <span>Night Lights</span>
      </label>

      <label class="toggle-row">
        <input
          type="checkbox"
          checked={sunInfo}
          onchange={() => showSunInfo.set(!sunInfo)}
        />
        <span>Sun Data Panel</span>
      </label>

      <div class="toggle-row-with-info">
        <label class="toggle-row">
          <input
            type="checkbox"
            checked={eqTropics}
            onchange={() => showEquatorTropics.set(!eqTropics)}
          />
          <span>Equator & Tropics</span>
        </label>
        <label class="toggle-row-inline" class:disabled={!eqTropics}>
          <input
            type="checkbox"
            checked={eqTropicsLabels}
            disabled={!eqTropics}
            onchange={() => showEquatorTropicsLabels.set(!eqTropicsLabels)}
          />
          <span>Labels</span>
        </label>
        <button
          class="info-btn"
          onclick={() => toggleInfo("equatorTropics")}
          aria-label="About equator and tropics">?</button
        >
        {#if openInfo === "equatorTropics"}
          <div class="info-popup">
            <p>{infoContent.equatorTropics.text}</p>
            <a
              href={infoContent.equatorTropics.url}
              target="_blank"
              rel="noopener noreferrer">{infoContent.equatorTropics.urlLabel}</a
            >
          </div>
        {/if}
      </div>

      <div class="toggle-row-with-info">
        <label class="toggle-row">
          <input
            type="checkbox"
            checked={arcticCirc}
            onchange={() => showArcticCircles.set(!arcticCirc)}
          />
          <span>Arctic/Antarctic Circles</span>
        </label>
        <label class="toggle-row-inline" class:disabled={!arcticCirc}>
          <input
            type="checkbox"
            checked={arcticCircLabels}
            disabled={!arcticCirc}
            onchange={() => showArcticCirclesLabels.set(!arcticCircLabels)}
          />
          <span>Labels</span>
        </label>
        <button
          class="info-btn"
          onclick={() => toggleInfo("arcticCircles")}
          aria-label="About arctic and antarctic circles">?</button
        >
        {#if openInfo === "arcticCircles"}
          <div class="info-popup">
            <p>{infoContent.arcticCircles.text}</p>
            <a
              href={infoContent.arcticCircles.url}
              target="_blank"
              rel="noopener noreferrer">{infoContent.arcticCircles.urlLabel}</a
            >
          </div>
        {/if}
      </div>

      <div class="toggle-row-with-info">
        <label class="toggle-row">
          <input
            type="checkbox"
            checked={subsolar}
            onchange={() => showSubsolarPoint.set(!subsolar)}
          />
          <span>Subsolar Point</span>
        </label>
        <button
          class="info-btn"
          onclick={() => toggleInfo("subsolarPoint")}
          aria-label="About the subsolar point">?</button
        >
        {#if openInfo === "subsolarPoint"}
          <div class="info-popup">
            <p>{infoContent.subsolarPoint.text}</p>
            <a
              href={infoContent.subsolarPoint.url}
              target="_blank"
              rel="noopener noreferrer">{infoContent.subsolarPoint.urlLabel}</a
            >
          </div>
        {/if}
      </div>

      <div class="panel-divider">
        <span class="divider-label">Axial Tilt</span>
      </div>

      <div class="tilt-control">
        <div class="tilt-slider-row">
          <input
            type="range"
            class="tilt-slider"
            min="0"
            max="90"
            step="0.5"
            value={tilt}
            oninput={(e) =>
              axialTilt.set(Number((e.target as HTMLInputElement).value))}
            aria-label="Axial tilt in degrees"
          />
          <span class="tilt-value">{tilt.toFixed(1)}&deg;</span>
          {#if tilt !== REAL_AXIAL_TILT}
            <button
              class="btn tilt-reset"
              onclick={() => axialTilt.set(REAL_AXIAL_TILT)}
              aria-label="Reset to Earth's tilt"
            >
              Reset
            </button>
          {/if}
          <button
            class="info-btn"
            onclick={() => toggleInfo("axialTilt")}
            aria-label="About axial tilt">?</button
          >
        </div>
        <div class="tilt-tick" style="left: {(REAL_AXIAL_TILT / 90) * 100}%">
          <span class="tilt-tick-label">Earth</span>
        </div>
        {#if openInfo === "axialTilt"}
          <div class="info-popup tilt-info-popup">
            <p>{infoContent.axialTilt.text}</p>
            <a
              href={infoContent.axialTilt.url}
              target="_blank"
              rel="noopener noreferrer">{infoContent.axialTilt.urlLabel}</a
            >
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .panel-header {
    padding: 0.6rem 0.8rem;
    border-bottom: 1px solid var(--color-border);
  }

  .panel-title {
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: var(--color-text);
    justify-content: center;
    align-items: center;
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
    content: "";
    flex: 1;
    height: 1px;
    background: var(--color-border);
  }

  .panel-divider-btn {
    background: none;
    cursor: pointer;
    border: none;
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
  }

  .panel-divider-btn:hover .divider-label {
    color: var(--color-text);
  }

  .divider-chevron {
    font-size: 0.55rem;
    color: var(--color-text-muted);
    transition: transform 0.15s;
    display: inline-block;
  }

  .divider-chevron.open {
    transform: rotate(90deg);
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

  .toggles {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .toggle-row:hover {
    color: var(--color-text);
  }

  .toggle-row input[type="checkbox"] {
    accent-color: var(--color-accent);
  }

  .toggle-row-inline {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    font-size: 0.65rem;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .toggle-row-inline:hover {
    color: var(--color-text);
  }

  .toggle-row-inline input[type="checkbox"] {
    accent-color: var(--color-accent);
  }

  .toggle-row-inline.disabled {
    opacity: 0.4;
    pointer-events: none;
  }

  .toggle-row-with-info {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    position: relative;
  }

  .toggle-row-with-info .toggle-row {
    flex: 1;
  }

  .info-btn {
    flex-shrink: 0;
    margin-left: auto;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text-muted);
    font-size: 0.7rem;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    margin-top: 0;
    transition:
      border-color 0.15s,
      color 0.15s;
  }

  .info-btn:hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .info-popup {
    position: absolute;
    right: 0;
    top: 1.6rem;
    width: 15rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.6rem;
    z-index: 20;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .info-popup p {
    font-size: 0.7rem;
    color: var(--color-text);
    line-height: 1.4;
    margin-bottom: 0.4rem;
  }

  .info-popup a {
    font-size: 0.65rem;
    color: var(--color-accent);
    text-decoration: none;
  }

  .info-popup a:hover {
    text-decoration: underline;
  }

  .tilt-control {
    position: relative;
  }

  .tilt-slider-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .tilt-slider {
    flex: 1;
    height: 4px;
    accent-color: var(--color-accent);
    cursor: pointer;
  }

  .tilt-value {
    font-family: "SF Mono", "Fira Code", "Cascadia Code", monospace;
    font-size: 0.75rem;
    color: var(--color-text);
    min-width: 3rem;
    text-align: right;
  }

  .tilt-reset {
    padding: 0.15rem 0.4rem;
    font-size: 0.6rem;
  }

  .tilt-tick {
    position: relative;
    height: 0.9rem;
    pointer-events: none;
  }

  .tilt-tick::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 1px;
    height: 5px;
    background: var(--color-text-muted);
  }

  .tilt-tick-label {
    position: absolute;
    left: 0;
    top: 5px;
    transform: translateX(-50%);
    font-size: 0.55rem;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  .tilt-info-popup {
    position: relative;
    top: 0.3rem;
    right: auto;
    width: auto;
  }
</style>

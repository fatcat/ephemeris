<script lang="ts">
  import { userLocation, recentLocations } from '../stores/settings.js';
  import type { UserLocation } from '../stores/settings.js';

  let name = $state('');
  let lat = $state(0);
  let lon = $state(0);
  let recent: UserLocation[] = $state([]);
  let showInfo = $state(false);

  userLocation.subscribe((v) => {
    name = v.name;
    lat = v.lat;
    lon = v.lon;
  });
  recentLocations.subscribe((v) => (recent = v));

  function onNameChange(e: Event) {
    const input = e.target as HTMLInputElement;
    userLocation.set({ name: input.value, lat, lon });
  }

  function onLatChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const v = Math.max(-90, Math.min(90, parseFloat(input.value) || 0));
    userLocation.set({ name, lat: v, lon });
  }

  function onLonChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const v = Math.max(-180, Math.min(180, parseFloat(input.value) || 0));
    userLocation.set({ name, lat, lon: v });
  }

  function selectRecent(loc: UserLocation) {
    userLocation.set({ ...loc });
  }

  function formatLabel(loc: UserLocation): string {
    if (loc.name) return loc.name;
    const latStr = loc.lat === 0 ? '0°' : `${Math.abs(loc.lat).toFixed(2)}°${loc.lat > 0 ? 'N' : 'S'}`;
    const lonStr = loc.lon === 0 ? '0°' : Math.abs(loc.lon) === 180 ? '180°' : `${Math.abs(loc.lon).toFixed(2)}°${loc.lon > 0 ? 'E' : 'W'}`;
    return `${latStr}, ${lonStr}`;
  }

</script>

<div class="location-input">
  <div class="location-header">
    {#if recent.length > 1}
      <select
        class="recent-select"
        onchange={(e) => {
          const idx = parseInt((e.target as HTMLSelectElement).value);
          if (!isNaN(idx)) selectRecent(recent[idx]);
        }}
        aria-label="Recent locations"
      >
        {#each recent as loc, i (loc.lat + ',' + loc.lon)}
          <option value={i} selected={loc.lat === lat && loc.lon === lon}>
            {formatLabel(loc)}
          </option>
        {/each}
      </select>
    {:else}
      <input
        type="text"
        class="name-input"
        value={name}
        oninput={onNameChange}
        placeholder="Location name"
        aria-label="Location name"
      />
    {/if}
    <button class="info-btn" onclick={() => (showInfo = !showInfo)} aria-label="Location help">?</button>
  </div>

  {#if showInfo}
    <div class="info-popup">
      <p>Click on the globe or projection to set a location. You can also type coordinates below. The last 3 locations are remembered in the dropdown.</p>
    </div>
  {/if}

  {#if recent.length > 1}
    <input
      type="text"
      class="name-input"
      value={name}
      oninput={onNameChange}
      placeholder="Location name"
      aria-label="Location name"
    />
  {/if}

  <div class="coord-row">
    <label class="coord-field">
      <input
        type="number"
        class="coord-input"
        value={lat}
        min={-90}
        max={90}
        step={0.01}
        onchange={onLatChange}
        aria-label="Latitude"
      />
    </label>
    <label class="coord-field">
      <input
        type="number"
        class="coord-input"
        value={lon}
        min={-180}
        max={180}
        step={0.01}
        onchange={onLonChange}
        aria-label="Longitude"
      />
    </label>
  </div>
</div>

<style>
  .location-input {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .location-header {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .recent-select {
    flex: 1;
    min-width: 0;
    padding: 0.2rem 0.3rem;
    font-size: 0.7rem;
    font-family: inherit;
    background: var(--color-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .recent-select:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .name-input {
    flex: 1;
    min-width: 0;
    padding: 0.2rem 0.3rem;
    font-size: 0.7rem;
    font-family: inherit;
    background: var(--color-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .name-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .info-btn {
    flex-shrink: 0;
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
    transition: border-color 0.15s, color 0.15s;
  }

  .info-btn:hover {
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .info-popup {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .info-popup p {
    font-size: 0.7rem;
    color: var(--color-text);
    line-height: 1.4;
    margin: 0;
  }

  .coord-row {
    display: flex;
    gap: 0.3rem;
  }

  .coord-field {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    flex: 1;
    min-width: 0;
  }

  .coord-input {
    flex: 1;
    min-width: 0;
    padding: 0.2rem 0.3rem;
    font-size: 0.7rem;
    font-family: inherit;
    background: var(--color-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .coord-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  /* Hide number input spinners */
  .coord-input[type='number']::-webkit-inner-spin-button,
  .coord-input[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .coord-input[type='number'] {
    appearance: textfield;
    -moz-appearance: textfield;
  }
</style>

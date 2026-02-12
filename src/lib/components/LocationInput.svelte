<script lang="ts">
  import { userLocation, recentLocations } from '../stores/settings.js';
  import type { UserLocation } from '../stores/settings.js';
  import placesData from '../../assets/geo/places.json';

  type Place = [name: string, country: string, lat: number, lon: number];
  const places: Place[] = placesData as Place[];

  let query = $state('');
  let lat = $state(0);
  let lon = $state(0);
  let recent: UserLocation[] = $state([]);
  let showInfo = $state(false);
  let results: Place[] = $state([]);
  let showResults = $state(false);
  let highlightIdx = $state(-1);

  userLocation.subscribe((v) => {
    query = v.name;
    lat = v.lat;
    lon = v.lon;
  });
  recentLocations.subscribe((v) => (recent = v));

  function searchPlaces(q: string): Place[] {
    if (q.length < 2) return [];
    const lower = q.toLowerCase();
    const matches: Place[] = [];
    for (const p of places) {
      if (p[0].toLowerCase().includes(lower) || p[1].toLowerCase().includes(lower)) {
        matches.push(p);
        if (matches.length >= 8) break;
      }
    }
    return matches;
  }

  function onSearchInput(e: Event) {
    const input = e.target as HTMLInputElement;
    query = input.value;
    results = searchPlaces(query);
    showResults = results.length > 0;
    highlightIdx = -1;
  }

  function selectPlace(p: Place) {
    const name = `${p[0]}, ${p[1]}`;
    userLocation.set({ name, lat: p[2], lon: p[3] });
    query = name;
    showResults = false;
    highlightIdx = -1;
  }

  function onSearchKeydown(e: KeyboardEvent) {
    if (!showResults) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightIdx = Math.min(highlightIdx + 1, results.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightIdx = Math.max(highlightIdx - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIdx >= 0 && highlightIdx < results.length) {
        selectPlace(results[highlightIdx]);
      } else if (results.length > 0) {
        selectPlace(results[0]);
      }
    } else if (e.key === 'Escape') {
      showResults = false;
      highlightIdx = -1;
    }
  }

  function onSearchFocus() {
    if (results.length > 0) showResults = true;
  }

  function onSearchBlur() {
    // Delay to allow click on result to fire first
    setTimeout(() => {
      showResults = false;
      highlightIdx = -1;
    }, 150);
  }

  function selectRecent(loc: UserLocation) {
    userLocation.set({ ...loc });
  }

  function onLatChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const v = Math.max(-90, Math.min(90, parseFloat(input.value) || 0));
    userLocation.set({ name: query, lat: v, lon });
  }

  function onLonChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const v = Math.max(-180, Math.min(180, parseFloat(input.value) || 0));
    userLocation.set({ name: query, lat, lon: v });
  }

  function formatLabel(loc: UserLocation): string {
    if (loc.name) return loc.name;
    const latStr = loc.lat === 0 ? '0\u00B0' : `${Math.abs(loc.lat).toFixed(2)}\u00B0${loc.lat > 0 ? 'N' : 'S'}`;
    const lonStr = loc.lon === 0 ? '0\u00B0' : Math.abs(loc.lon) === 180 ? '180\u00B0' : `${Math.abs(loc.lon).toFixed(2)}\u00B0${loc.lon > 0 ? 'E' : 'W'}`;
    return `${latStr}, ${lonStr}`;
  }
</script>

<div class="location-input">
  <div class="search-wrapper">
    <div class="search-row">
      <input
        type="text"
        class="search-input"
        value={query}
        oninput={onSearchInput}
        onkeydown={onSearchKeydown}
        onfocus={onSearchFocus}
        onblur={onSearchBlur}
        placeholder="Search places..."
        aria-label="Search places"
        autocomplete="off"
      />
      <button class="info-btn" onclick={() => (showInfo = !showInfo)} aria-label="Location help">?</button>
    </div>
    {#if showResults}
      <ul class="results-dropdown" role="listbox">
        {#each results as p, i (p[0] + p[1] + p[2])}
          <li
            class="result-item"
            class:highlighted={i === highlightIdx}
            role="option"
            aria-selected={i === highlightIdx}
            onpointerdown={() => selectPlace(p)}
          >
            <span class="result-name">{p[0]}</span>
            <span class="result-country">{p[1]}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  {#if showInfo}
    <div class="info-popup">
      <p>Search for a city or country, click on the globe or projection, or type coordinates below. The last 3 locations are saved.</p>
    </div>
  {/if}

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

  .search-wrapper {
    position: relative;
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .search-input {
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

  .search-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .results-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 1.75rem;
    z-index: 60;
    margin: 2px 0 0;
    padding: 0;
    list-style: none;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    max-height: 12rem;
    overflow-y: auto;
  }

  .result-item {
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
    padding: 0.3rem 0.4rem;
    cursor: pointer;
    font-size: 0.7rem;
    color: var(--color-text);
  }

  .result-item:hover,
  .result-item.highlighted {
    background: var(--color-bg);
    color: var(--color-accent);
  }

  .result-name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .result-country {
    color: var(--color-text-muted);
    font-size: 0.6rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .result-item:hover .result-country,
  .result-item.highlighted .result-country {
    color: var(--color-text-muted);
  }

  .recent-select {
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

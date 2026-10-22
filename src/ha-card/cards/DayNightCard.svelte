<script lang="ts">
  import { subsolarPoint } from '../../lib/astronomy/daylightRegions.js';
  import type { CardState } from '../cardState.svelte.js';
  import CardShell from '../components/CardShell.svelte';
  import ChipGroup from '../components/ChipGroup.svelte';
  import Legend from '../components/Legend.svelte';
  import DayNightGlobe from './DayNightGlobe.svelte';
  import DayNightMap from './DayNightMap.svelte';
  import type { DayNightConfig, MapView } from './dayNightConfig.js';
  import { markedPlaces, nightLegend } from './dayNightLayers.js';
  import type { PersonMarker } from './people.js';

  let { cardState }: { cardState: CardState } = $props();

  // parseDayNightConfig and peopleFromHass produced these, so the casts hold
  let map = $derived(cardState.config?.card as DayNightConfig | undefined);
  let people = $derived((cardState.hassData as PersonMarker[] | null) ?? []);

  // The in-card toggle overrides this until the config changes again
  let view = $derived<MapView>(map?.view ?? 'map');

  const VIEW_OPTIONS: { id: MapView; label: string }[] = [
    { id: 'map', label: 'Map' },
    { id: 'globe', label: 'Globe' },
  ];
</script>

<CardShell {cardState}>
  {#snippet chart(instant)}
    {#if map && cardState.home}
      {@const home = cardState.home}
      {@const sub = subsolarPoint(instant)}
      {@const places = markedPlaces(home, people)}
      <figure class="day-night" class:dark={home.dark}>
        {#if view === 'globe'}
          <DayNightGlobe {home} {instant} {sub} {map} {places} />
        {:else}
          <DayNightMap {home} {instant} {sub} {map} {places} />
        {/if}
        <Legend label="Map key" items={nightLegend(map.layers)} />
      </figure>
    {/if}
  {/snippet}
  {#snippet controls()}
    <ChipGroup label="View" options={VIEW_OPTIONS} selected={view} onpick={(id) => (view = id)} />
  {/snippet}
</CardShell>

<style>
  /* Map colors live here so both views and the key below them can use them */
  .day-night {
    --map-ocean: var(--ephemeris-map-ocean-color, #cfe2f0);
    --map-land: var(--ephemeris-map-land-color, #a9bf8c);
    --map-night: var(--ephemeris-map-night-color, #0b1a2e);
    --map-grid: rgba(0, 0, 0, 0.25);
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .day-night.dark {
    --map-ocean: var(--ephemeris-map-ocean-color, #1f3446);
    --map-land: var(--ephemeris-map-land-color, #6f8a5e);
    --map-night: var(--ephemeris-map-night-color, #02060c);
    --map-grid: rgba(255, 255, 255, 0.28);
  }

  /* The equator and tropics, drawn the same on the map and the globe */
  .day-night :global(.grid) {
    fill: none;
    stroke: var(--map-grid);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }

  .day-night :global(.tropic) {
    stroke-dasharray: 4 6;
  }
</style>

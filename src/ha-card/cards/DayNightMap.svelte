<script lang="ts">
  import { darkRegion, regionPathData, wrapLongitude, type GeoPoint } from '../../lib/astronomy/daylightRegions.js';
  import { solarPosition } from '../../lib/astronomy/solar.js';
  import { loadLand } from '../geo/land.js';
  import type { HomeContext } from '../home.js';
  import type { DayNightConfig } from './dayNightConfig.js';
  import { describeView, nightLayers, type Place } from './dayNightLayers.js';
  import MapPins from './MapPins.svelte';

  let {
    home,
    instant,
    sub,
    map,
    places,
  }: { home: HomeContext; instant: Date; sub: GeoPoint; map: DayNightConfig; places: Place[] } = $props();

  let land = $state<string | null>(null);

  $effect(() => {
    let live = true;
    loadLand()
      .then((d) => {
        if (live) land = d;
      })
      .catch((err: unknown) => console.warn('Ephemeris: could not load the land outline', err));
    return () => {
      live = false;
    };
  });

  let center = $derived(map.centerLongitude);

  // Map space is 360 × 180 with the center longitude in the middle
  const yOf = (lat: number) => 90 - lat;
  let xOf = $derived((lon: number) => lon - center + 180);
  let wrappedX = $derived((lon: number) => wrapLongitude(lon - center) + 180);

  // Land is drawn in Greenwich-centered space; a second copy fills the wrapped side
  let landOffsets = $derived([-center, center >= 0 ? 360 - center : -360 - center]);

  let layers = $derived(
    nightLayers(map.layers.includes('twilight')).map((l) => ({
      ...l,
      d: regionPathData(darkRegion(sub, l.alt, center - 180), xOf, yOf),
    })),
  );

  let tropicLat = $derived(solarPosition(instant).obliquity * (180 / Math.PI));

  let pins = $derived(
    places.map((p) => ({ ...p, left: wrappedX(p.lon) / 360, top: yOf(p.lat) / 180 })),
  );

  let sun = $derived(
    map.layers.includes('sun') ? { left: wrappedX(sub.lon) / 360, top: yOf(sub.lat) / 180 } : null,
  );

  let label = $derived(describeView('World map', sub, places.map((p) => p.name), home));
</script>

<div class="map">
  <svg viewBox="0 0 360 180" role="img" aria-label={label}>
    {#if land}
      {#each landOffsets as dx (dx)}
        <path class="land" d={land} transform="translate({dx} 0)" />
      {/each}
    {/if}

    {#if map.layers.includes('tropics')}
      <line class="grid" x1="0" y1="90" x2="360" y2="90" />
      <line class="grid tropic" x1="0" y1={yOf(tropicLat)} x2="360" y2={yOf(tropicLat)} />
      <line class="grid tropic" x1="0" y1={yOf(-tropicLat)} x2="360" y2={yOf(-tropicLat)} />
    {/if}

    {#each layers as l (l.alt)}
      <path class="night" d={l.d} style:opacity={l.opacity} />
    {/each}
  </svg>

  <MapPins {pins} {sun} />
</div>

<style>
  .map {
    position: relative;
    aspect-ratio: 2 / 1;
    border-radius: 8px;
    overflow: hidden;
    background: var(--map-ocean);
  }

  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }

  .land {
    fill: var(--map-land);
    fill-rule: evenodd;
  }

  .night {
    fill: var(--map-night);
  }
</style>

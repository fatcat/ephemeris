<script lang="ts">
  import { onMount } from 'svelte';
  import {
    TWILIGHT_LIMITS,
    darkRegion,
    regionPathData,
    subsolarPoint,
    wrapLongitude,
  } from '../../lib/astronomy/daylightRegions.js';
  import { SUNRISE_ALTITUDE_DEG, solarPosition } from '../../lib/astronomy/solar.js';
  import Legend, { type LegendItem } from '../components/Legend.svelte';
  import { formatLatitude, formatLongitude } from '../format.js';
  import type { HomeContext } from '../home.js';
  import type { DayNightConfig } from './dayNightConfig.js';
  import type { PersonMarker } from './people.js';

  let {
    home,
    instant,
    map,
    people,
  }: { home: HomeContext; instant: Date; map: DayNightConfig; people: PersonMarker[] } = $props();

  // Each twilight band darkens what is under it, so night is all four layers stacked
  const BAND_OPACITY = 0.3;
  const TWILIGHT_OPACITY = 0.16;
  const PLAIN_NIGHT_OPACITY = 0.62;
  // The key shows twilight as the first two layers, about midway through the bands
  const TWILIGHT_SHADE = 1 - (1 - BAND_OPACITY) * (1 - TWILIGHT_OPACITY);
  const NIGHT_SHADE = 1 - (1 - BAND_OPACITY) * (1 - TWILIGHT_OPACITY) ** (TWILIGHT_LIMITS.length - 1);
  /** Past this share of the width, a label goes on the left of its dot */
  const FLIP_LABEL_AT = 0.8;

  let land = $state<string | null>(null);

  onMount(() => {
    let live = true;
    import('virtual:ephemeris-land')
      .then((m) => {
        if (live) land = m.default;
      })
      .catch((err: unknown) => console.warn('Ephemeris: could not load the land outline', err));
    return () => {
      live = false;
    };
  });

  let center = $derived(map.centerLongitude);
  let twilight = $derived(map.layers.includes('twilight'));

  // Map space is 360 × 180 with the center longitude in the middle
  const yOf = (lat: number) => 90 - lat;
  let xOf = $derived((lon: number) => lon - center + 180);
  let wrappedX = $derived((lon: number) => wrapLongitude(lon - center) + 180);

  // Land is drawn in Greenwich-centered space; a second copy fills the wrapped side
  let landOffsets = $derived([-center, center >= 0 ? 360 - center : -360 - center]);

  let sub = $derived(subsolarPoint(instant));

  let layers = $derived(
    (twilight
      ? TWILIGHT_LIMITS.map((alt, i) => ({ alt, opacity: i === 0 ? BAND_OPACITY : TWILIGHT_OPACITY }))
      : [{ alt: SUNRISE_ALTITUDE_DEG, opacity: PLAIN_NIGHT_OPACITY }]
    ).map((l) => ({ ...l, d: regionPathData(darkRegion(sub, l.alt, center - 180), xOf, yOf) })),
  );

  let tropicLat = $derived(solarPosition(instant).obliquity * (180 / Math.PI));

  interface Pin {
    id: string;
    name: string;
    left: number;
    top: number;
    home: boolean;
  }

  let pins = $derived<Pin[]>(
    [{ id: 'home', name: 'Home', lat: home.lat, lon: home.lon }, ...people].map((p) => ({
      id: p.id,
      name: p.name,
      left: wrappedX(p.lon) / 360,
      top: yOf(p.lat) / 180,
      home: p.id === 'home',
    })),
  );

  let sunPos = $derived({ left: wrappedX(sub.lon) / 360, top: yOf(sub.lat) / 180 });

  let label = $derived(
    `World map of day and night. The sun is overhead at ${formatLatitude(sub.lat, home)}, ` +
      `${formatLongitude(sub.lon, home)}. Marked: ${pins.map((p) => p.name).join(', ')}.`,
  );

  const shade = (amount: number) =>
    `color-mix(in srgb, var(--map-night) ${Math.round(amount * 100)}%, var(--map-land))`;

  let legend = $derived<LegendItem[]>([
    ...(map.layers.includes('sun')
      ? [{ name: 'Sun overhead', color: 'var(--ephemeris-sun-color)', swatch: 'dot' as const }]
      : []),
    { name: 'Day', color: 'var(--map-land)', swatch: 'box' },
    ...(twilight ? [{ name: 'Twilight', color: shade(TWILIGHT_SHADE), swatch: 'box' as const }] : []),
    { name: 'Night', color: shade(twilight ? NIGHT_SHADE : PLAIN_NIGHT_OPACITY), swatch: 'box' },
  ]);

  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
</script>

<figure class="day-night-map" class:dark={home.dark}>
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

    {#if map.layers.includes('sun')}
      <span class="sun" style:left={pct(sunPos.left)} style:top={pct(sunPos.top)} aria-hidden="true"></span>
    {/if}

    {#each pins as p (p.id)}
      <span
        class="pin"
        class:home={p.home}
        class:flip={p.left > FLIP_LABEL_AT}
        style:left={pct(p.left)}
        style:top={pct(p.top)}
        aria-hidden="true"
      >
        <span class="dot"></span>
        <span class="pin-label">{p.name}</span>
      </span>
    {/each}
  </div>

  <Legend label="Map key" items={legend} />
</figure>

<style>
  /* Map colors live here so the key below the map can use them too */
  .day-night-map {
    --map-ocean: var(--ephemeris-map-ocean-color, #cfe2f0);
    --map-land: var(--ephemeris-map-land-color, #a9bf8c);
    --map-night: var(--ephemeris-map-night-color, #0b1a2e);
    --map-grid: rgba(0, 0, 0, 0.25);
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .day-night-map.dark {
    --map-ocean: var(--ephemeris-map-ocean-color, #1f3446);
    --map-land: var(--ephemeris-map-land-color, #6f8a5e);
    --map-night: var(--ephemeris-map-night-color, #02060c);
    --map-grid: rgba(255, 255, 255, 0.28);
  }

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

  .grid {
    stroke: var(--map-grid);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }

  .tropic {
    stroke-dasharray: 4 6;
  }

  .night {
    fill: var(--map-night);
  }

  .sun {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--ephemeris-sun-color);
    border: 1.5px solid var(--ephemeris-sun-edge-color);
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--ephemeris-sun-color) 30%, transparent);
  }

  .pin {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 4px;
    /* Center on the dot, not on dot plus label */
    transform: translate(-6px, -50%);
  }

  .pin.flip {
    flex-direction: row-reverse;
    transform: translate(calc(-100% + 6px), -50%);
  }

  .dot {
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #1c1c1c;
  }

  .home .dot {
    background: var(--primary-color, #03a9f4);
  }

  .pin-label {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    color: #ffffff;
    text-shadow:
      0 0 3px #1c1c1c,
      0 0 2px #1c1c1c;
  }
</style>

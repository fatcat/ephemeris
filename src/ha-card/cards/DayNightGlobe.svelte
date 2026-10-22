<script lang="ts">
  import type { GeoPoint } from '../../lib/astronomy/daylightRegions.js';
  import { solarPosition } from '../../lib/astronomy/solar.js';
  import { loadLand } from '../geo/land.js';
  import { parallelPathData, project, unproject } from '../geo/orthographic.js';
  import type { HomeContext } from '../home.js';
  import type { DayNightConfig } from './dayNightConfig.js';
  import { describeView, nightLayers, stackedShade, type Place } from './dayNightLayers.js';
  import MapPins from './MapPins.svelte';

  let {
    home,
    instant,
    sub,
    map,
    places,
  }: { home: HomeContext; instant: Date; sub: GeoPoint; map: DayNightConfig; places: Place[] } = $props();

  const DEG = Math.PI / 180;
  /** The land raster's resolution, in pixels per degree */
  const RASTER_SCALE = 4;
  /** Enough pixels for a sharp globe on a large card without slowing small devices */
  const MAX_CANVAS = 900;
  /** Grid overlay drawn on a 200 × 200 box, the globe's radius 100 */
  const R = 100;

  let box = $state<HTMLDivElement>();
  let canvas = $state<HTMLCanvasElement>();
  let size = $state(0);
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

  $effect(() => {
    if (!box) return;
    const ro = new ResizeObserver(([entry]) => {
      size = Math.min(MAX_CANVAS, Math.round(entry.contentRect.height * devicePixelRatio));
    });
    ro.observe(box);
    return () => ro.disconnect();
  });

  // The globe faces home
  let center = $derived<GeoPoint>({ lat: home.lat, lon: home.lon });

  /** A CSS color, such as a theme variable's value, as RGB */
  function rgbOf(color: string): [number, number, number] {
    const c = document.createElement('canvas').getContext('2d')!;
    c.fillStyle = color;
    c.fillRect(0, 0, 1, 1);
    const [r, g, b] = c.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  }

  /**
   * What each canvas pixel shows, worked out once per size, center, land and theme:
   * its base color, which way that spot on Earth faces, and how much of the pixel the
   * disk covers (for a smooth rim).
   */
  let base = $derived.by(() => {
    if (!land || !size || !box) return null;
    void home.dark; // theme colors live on the figure and change with it
    const style = getComputedStyle(box);
    const ocean = rgbOf(style.getPropertyValue('--map-ocean'));
    const landRgb = rgbOf(style.getPropertyValue('--map-land'));
    const night = rgbOf(style.getPropertyValue('--map-night'));

    // The flat map, Greenwich in the middle, as the globe's texture
    const w = 360 * RASTER_SCALE;
    const h = 180 * RASTER_SCALE;
    const flat = document.createElement('canvas');
    flat.width = w;
    flat.height = h;
    const fc = flat.getContext('2d')!;
    fc.fillStyle = `rgb(${ocean})`;
    fc.fillRect(0, 0, w, h);
    fc.scale(RASTER_SCALE, RASTER_SCALE);
    fc.fillStyle = `rgb(${landRgb})`;
    fc.fill(new Path2D(land), 'evenodd');
    const texture = fc.getImageData(0, 0, w, h).data;

    const n = size * size;
    const color = new Uint8ClampedArray(n * 3);
    const normal = new Float32Array(n * 3);
    const cover = new Float32Array(n);
    const half = size / 2;
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const x = (i + 0.5 - half) / half;
        const y = (half - j - 0.5) / half;
        const k = j * size + i;
        const rho = Math.hypot(x, y);
        cover[k] = Math.max(0, Math.min(1, (1 - rho) * half + 0.5));
        if (!cover[k]) continue;
        // Rim pixels partly outside the disk take the color just inside it
        const s = rho > 1 ? 1 / rho : 1;
        const p = unproject(center, x * s, y * s);
        if (!p) continue;
        const tx = Math.min(w - 1, Math.floor((p.lon + 180) * RASTER_SCALE));
        const ty = Math.min(h - 1, Math.floor((90 - p.lat) * RASTER_SCALE));
        const t = (ty * w + tx) * 4;
        color[k * 3] = texture[t];
        color[k * 3 + 1] = texture[t + 1];
        color[k * 3 + 2] = texture[t + 2];
        const cl = Math.cos(p.lat * DEG);
        normal[k * 3] = cl * Math.cos(p.lon * DEG);
        normal[k * 3 + 1] = cl * Math.sin(p.lon * DEG);
        normal[k * 3 + 2] = Math.sin(p.lat * DEG);
      }
    }
    return { color, normal, cover, night };
  });

  // Each time step only re-shades: the sun's altitude at a spot is its normal · the sun
  $effect(() => {
    if (!base || !canvas) return;
    const layers = nightLayers(map.layers.includes('twilight'));
    const limits = layers.map((l) => Math.sin(l.alt * DEG));
    const shadeOf = layers.map((_, i) => stackedShade(layers, i + 1));
    const cs = Math.cos(sub.lat * DEG);
    const sx = cs * Math.cos(sub.lon * DEG);
    const sy = cs * Math.sin(sub.lon * DEG);
    const sz = Math.sin(sub.lat * DEG);
    const [nr, ng, nb] = base.night;

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(size, size);
    const out = img.data;
    const { color, normal, cover } = base;
    for (let k = 0; k < size * size; k++) {
      if (!cover[k]) continue;
      const sinAlt = normal[k * 3] * sx + normal[k * 3 + 1] * sy + normal[k * 3 + 2] * sz;
      // Layers run from the horizon down, so a spot is under every layer above its altitude
      let dark = 0;
      while (dark < limits.length && sinAlt < limits[dark]) dark++;
      const a = dark ? shadeOf[dark - 1] : 0;
      out[k * 4] = color[k * 3] + (nr - color[k * 3]) * a;
      out[k * 4 + 1] = color[k * 3 + 1] + (ng - color[k * 3 + 1]) * a;
      out[k * 4 + 2] = color[k * 3 + 2] + (nb - color[k * 3 + 2]) * a;
      out[k * 4 + 3] = cover[k] * 255;
    }
    ctx.putImageData(img, 0, 0);
  });

  let tropicLat = $derived(solarPosition(instant).obliquity * (180 / Math.PI));

  // The canvas is square and centered in a 4:3 box, so a disk point is at (4 + 3x) / 8 across
  const onBox = (p: GeoPoint) => {
    const d = project(center, p);
    return d.visible ? { left: (4 + 3 * d.x) / 8, top: (1 - d.y) / 2 } : null;
  };

  let pins = $derived(
    places.flatMap((p) => {
      const at = onBox(p);
      return at ? [{ ...p, ...at }] : [];
    }),
  );

  let sun = $derived(map.layers.includes('sun') ? onBox(sub) : null);

  let label = $derived(describeView('Globe', sub, pins.map((p) => p.name), home));
</script>

<div class="globe" bind:this={box} role="img" aria-label={label}>
  <canvas bind:this={canvas}></canvas>
  <svg viewBox="0 0 {2 * R} {2 * R}" aria-hidden="true">
    {#if map.layers.includes('tropics')}
      <path class="grid" d={parallelPathData(center, 0, R)} />
      <path class="grid tropic" d={parallelPathData(center, tropicLat, R)} />
      <path class="grid tropic" d={parallelPathData(center, -tropicLat, R)} />
    {/if}
    <circle class="rim" cx={R} cy={R} r={R - 0.5} />
  </svg>
  <MapPins {pins} {sun} />
</div>

<style>
  /* Taller than the map's 2:1, so the globe isn't tiny on a narrow card */
  .globe {
    position: relative;
    aspect-ratio: 4 / 3;
  }

  canvas,
  svg {
    position: absolute;
    top: 0;
    left: 12.5%;
    width: 75%;
    height: 100%;
    display: block;
  }

  svg {
    overflow: visible;
    fill: none;
  }

  .rim {
    stroke: var(--map-grid);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }
</style>

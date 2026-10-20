<script lang="ts">
  import {
    chartFrame,
    compassLabels,
    pathData,
    project,
    surfaceNormal,
    type ChartOrientation,
  } from '../../lib/astronomy/polarChart.js';
  import { sunElevationAzimuth } from '../../lib/astronomy/solar.js';
  import {
    seasonalPathInfo,
    seasonalPathLabel,
    seasonalPaths,
    solarHourMarkers,
    sunPathForDay,
    type SeasonalPathId,
  } from '../../lib/astronomy/sunPath.js';
  import { localNoon, zonedParts, zonedToUtc } from '../format.js';
  import type { HomeContext } from '../home.js';
  import type { SkyConfig } from './skyConfig.js';

  let {
    home,
    instant,
    sky,
    orientation,
  }: { home: HomeContext; instant: Date; sky: SkyConfig; orientation: ChartOrientation } = $props();

  const SIZE = 360;
  const C = SIZE / 2;
  const R = 150;
  const HOUR_LABEL_OUTSET = 14;
  /** Label every third hour; a dot marks every hour */
  const LABEL_EVERY = 3;

  let frame = $derived(chartFrame(orientation, home.lat, C, C, R));
  let compass = $derived(compassLabels(frame));

  // Derived numbers, not dates, so the paths only recompute when the day or year changes
  let year = $derived(zonedParts(instant, home.timeZone).year);
  let dayNoon = $derived(localNoon(instant, home.timeZone).getTime());

  let seasonal = $derived(seasonalPaths(year, home.lat, home.lon));
  let roles = $derived(seasonalPathInfo(seasonal));
  let shownSeasonal = $derived(
    seasonal.filter((s) =>
      s.id === 'marchEquinox' ? sky.paths.includes('equinox') : sky.paths.includes('solstices'),
    ),
  );

  let dayPath = $derived(sunPathForDay(new Date(dayNoon), home.lat, home.lon));

  interface Hour {
    azimuth: number;
    elevation: number;
    label: string | null;
  }

  let hours = $derived.by((): Hour[] => {
    if (sky.hourMarkers === 'none') return [];
    if (sky.hourMarkers === 'solar') {
      return solarHourMarkers(new Date(dayNoon), home.lat, home.lon).map((m) => {
        const h = 12 + m.hourOffset;
        return { ...m, label: h % LABEL_EVERY === 0 ? hourLabel(h) : null };
      });
    }
    const { year: y, month, day } = zonedParts(new Date(dayNoon), home.timeZone);
    const out: Hour[] = [];
    for (let h = 0; h < 24; h++) {
      const p = sunElevationAzimuth(zonedToUtc(y, month, day, h * 60, home.timeZone), home.lat, home.lon);
      if (p.elevation > 0) out.push({ ...p, label: h % LABEL_EVERY === 0 ? hourLabel(h) : null });
    }
    return out;
  });

  function hourLabel(h: number): string {
    const hour = ((h % 24) + 24) % 24;
    if (!home.hour12) return String(hour);
    return `${hour % 12 || 12}${hour < 12 ? 'a' : 'p'}`;
  }

  let sun = $derived(sunElevationAzimuth(instant, home.lat, home.lon));
  let sunPos = $derived(project(frame, sun.azimuth, sun.elevation));

  let panels = $derived(
    sky.panels.map((p) => {
      const n = surfaceNormal(p.tilt, p.azimuth);
      return { name: p.name, ...project(frame, n.azimuth, n.elevation) };
    }),
  );

  const COLOR_VAR: Record<string, string> = {
    summer: 'var(--ephemeris-summer-color)',
    winter: 'var(--ephemeris-winter-color)',
    equinox: 'var(--ephemeris-equinox-color)',
  };
  const colorOf = (id: SeasonalPathId) => COLOR_VAR[roles[id].role];

  let legend = $derived([
    ...shownSeasonal.map((s) => ({ name: seasonalPathLabel(s.id, roles[s.id]), color: colorOf(s.id) })),
    ...(sky.paths.includes('today')
      ? [
          {
            name: sky.hourMarkers === 'none' ? 'This day' : `This day (${sky.hourMarkers} hours)`,
            color: 'var(--ephemeris-today-color)',
          },
        ]
      : []),
  ]);

  let chartLabel = $derived(
    `Sun path chart, ${compass.top === 'N' ? 'north' : 'south'} at the top. ` +
      (sun.elevation > 0
        ? `The sun is ${Math.round(sun.elevation)}° up, toward ${Math.round(sun.azimuth)}°.`
        : 'The sun is below the horizon.'),
  );
</script>

<figure class="sky-chart">
  <svg viewBox="0 0 {SIZE} {SIZE}" role="img" aria-label={chartLabel}>
    <circle class="sky" cx={C} cy={C} r={R} />
    <circle class="ring" cx={C} cy={C} r={(R * 2) / 3} />
    <circle class="ring" cx={C} cy={C} r={R / 3} />
    <line class="axis" x1={C} y1={C - R} x2={C} y2={C + R} />
    <line class="axis" x1={C - R} y1={C} x2={C + R} y2={C} />
    <text class="ring-label" x={C + 6} y={C - (R * 2) / 3}>30°</text>
    <text class="ring-label" x={C + 6} y={C - R / 3}>60°</text>
    <text class="compass" x={C} y={C - R - 13}>{compass.top}</text>
    <text class="compass" x={C + R + 13} y={C}>{compass.right}</text>
    <text class="compass" x={C} y={C + R + 13}>{compass.bottom}</text>
    <text class="compass" x={C - R - 13} y={C}>{compass.left}</text>

    {#each shownSeasonal as s (s.id)}
      <path class="path" d={pathData(frame, s.points)} style:stroke={colorOf(s.id)} />
    {/each}

    {#if sky.paths.includes('today')}
      <path class="path day-path" d={pathData(frame, dayPath)} />
    {/if}

    {#each hours as h, i (i)}
      {@const p = project(frame, h.azimuth, h.elevation)}
      <circle class="hour-dot" cx={p.x} cy={p.y} r="3.5" />
      {#if h.label}
        {@const q = project(frame, h.azimuth, h.elevation, HOUR_LABEL_OUTSET)}
        <text class="hour-label" x={q.x} y={q.y}>{h.label}</text>
      {/if}
    {/each}

    {#each panels as p, i (i)}
      <rect class="panel" x={p.x - 6} y={p.y - 6} width="12" height="12" rx="2" />
      <text class="panel-label" x={p.x + 10} y={p.y}>{p.name}</text>
    {/each}

    {#if sun.elevation > 0}
      <circle class="sun-glow" cx={sunPos.x} cy={sunPos.y} r="15" />
      <circle class="sun" cx={sunPos.x} cy={sunPos.y} r="8" />
    {/if}
  </svg>

  {#if legend.length}
    <ul class="legend" aria-label="Sun path key">
      {#each legend as item (item.name)}
        <li><span class="swatch" style:background={item.color}></span>{item.name}</li>
      {/each}
    </ul>
  {/if}
</figure>

<style>
  .sky-chart {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  svg {
    display: block;
    width: 100%;
    max-width: 360px;
    align-self: center;
    overflow: visible;
  }

  .sky {
    fill: color-mix(in srgb, var(--primary-color) 8%, transparent);
    stroke: var(--secondary-text-color);
    stroke-opacity: 0.6;
    stroke-width: 1.5;
  }

  .ring {
    fill: none;
    stroke: var(--secondary-text-color);
    stroke-opacity: 0.4;
    stroke-dasharray: 3 4;
  }

  .axis {
    stroke: var(--secondary-text-color);
    stroke-opacity: 0.3;
  }

  text {
    dominant-baseline: middle;
  }

  .ring-label {
    font-size: 10px;
    fill: var(--secondary-text-color);
  }

  .compass {
    font-size: 12px;
    font-weight: 600;
    text-anchor: middle;
    fill: var(--primary-text-color);
  }

  .path {
    fill: none;
    stroke-width: 2.5;
    stroke-linejoin: round;
  }

  .day-path {
    stroke: var(--ephemeris-today-color);
    stroke-width: 4;
    stroke-linecap: round;
  }

  .hour-dot {
    fill: var(--ephemeris-today-color);
    stroke: var(--ha-card-background, var(--card-background-color, #fff));
    stroke-width: 1.5;
  }

  .hour-label {
    font-size: 10px;
    font-weight: 600;
    text-anchor: middle;
    fill: var(--primary-text-color);
  }

  .panel {
    fill: none;
    stroke: var(--primary-text-color);
    stroke-width: 2;
  }

  .panel-label {
    font-size: 10px;
    fill: var(--primary-text-color);
  }

  .sun-glow {
    fill: #f6c445;
    opacity: 0.3;
  }

  .sun {
    fill: #f6c445;
    stroke: #b7860b;
    stroke-width: 1.5;
  }

  .legend {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px 16px;
    font-size: 12px;
    color: var(--secondary-text-color);
  }

  .legend li {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .swatch {
    width: 16px;
    height: 4px;
    border-radius: 2px;
  }
</style>

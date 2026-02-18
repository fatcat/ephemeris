<script lang="ts">
  import { computeSunData, type SunData } from '../astronomy/solar.js';
  import { currentTime } from '../stores/time.js';
  import { userLocation, useLocalTime, userTimezone, axialTilt, REAL_AXIAL_TILT, type UserLocation } from '../stores/settings.js';
  import { getUtcOffsetMs, getTimezoneAbbr } from '../utils/timezone.js';

  let loc: UserLocation = $state({ name: '', lat: 0, lon: 0 });
  let time: Date = $state(new Date());
  let localTime = $state(false);
  let tz = $state('Etc/UTC');
  let tilt = $state(REAL_AXIAL_TILT);
  userLocation.subscribe((v) => (loc = v));
  currentTime.subscribe((v) => (time = v));
  useLocalTime.subscribe((v) => (localTime = v));
  userTimezone.subscribe((v) => (tz = v));
  axialTilt.subscribe((v) => (tilt = v));

  let sunData: SunData = $derived(computeSunData(time, loc.lat, loc.lon, tilt));

  function formatTime(d: Date | null): string {
    if (!d) return '—';
    const adjusted = localTime ? new Date(d.getTime() + getUtcOffsetMs(d, tz)) : d;
    const h = adjusted.getUTCHours().toString().padStart(2, '0');
    const m = adjusted.getUTCMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }

  let timeLabel = $derived(localTime ? getTimezoneAbbr(time, tz) : 'UTC');

  function formatDayLength(hours: number): string {
    if (hours >= 24) return '24h 00m';
    if (hours <= 0) return '0h 00m';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  }

  function formatAngle(deg: number): string {
    return `${deg.toFixed(2)}°`;
  }

  function azimuthCardinal(deg: number): string {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(deg / 45) % 8;
    return dirs[idx];
  }

  function formatLat(v: number): string {
    if (v === 0) return '0°';
    return `${Math.abs(v).toFixed(2)}°${v > 0 ? 'N' : 'S'}`;
  }

  function formatLon(v: number): string {
    if (v === 0) return '0°';
    if (Math.abs(v) === 180) return '180°';
    return `${Math.abs(v).toFixed(2)}°${v > 0 ? 'E' : 'W'}`;
  }
</script>

<div class="sun-info">
  <div class="sun-header">
    Sun Data: {loc.name || `${formatLat(loc.lat)}, ${formatLon(loc.lon)}`}
  </div>
  <div class="sun-data">
    <span class="sun-item"><span class="sun-label">Elevation</span> <span class="sun-value">{formatAngle(sunData.elevation)}</span></span>
    <span class="sun-item"><span class="sun-label">Azimuth</span> <span class="sun-value">{formatAngle(sunData.azimuth)} {azimuthCardinal(sunData.azimuth)}</span></span>
    <span class="sun-item">
      <span class="sun-label">Sunrise</span>
      <span class="sun-value">{#if sunData.sunrise}{formatTime(sunData.sunrise)} {timeLabel}{:else if sunData.dayLength >= 24}—{:else}—{/if}</span>
    </span>
    <span class="sun-item">
      <span class="sun-label">Sunset</span>
      <span class="sun-value">{#if sunData.sunset}{formatTime(sunData.sunset)} {timeLabel}{:else if sunData.dayLength >= 24}—{:else}—{/if}</span>
    </span>
    <span class="sun-item"><span class="sun-label">Day Length</span> <span class="sun-value">{formatDayLength(sunData.dayLength)}</span></span>
    <span class="sun-item"><span class="sun-label">Solar Noon</span> <span class="sun-value">{formatTime(sunData.solarNoon)} {timeLabel}</span></span>
    <span class="sun-item"><span class="sun-label">Status</span> <span class="sun-value sun-status">{sunData.status}</span></span>
  </div>
</div>

<style>
  .sun-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .sun-header {
    color: var(--color-text-muted);
    letter-spacing: 0.04em;
    white-space: nowrap;
    font-size: 0.85rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sun-data {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    flex-wrap: wrap;
    font-size: 0.93rem;
  }

  .sun-item {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    white-space: nowrap;
  }

  .sun-label {
    color: var(--color-text-muted);
  }

  .sun-value {
    color: var(--color-text);
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    font-size: 0.93rem;
  }

  .sun-status {
    color: var(--color-accent);
  }
</style>

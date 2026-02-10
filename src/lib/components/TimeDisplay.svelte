<script lang="ts">
  import {
    currentTime,
    formattedTime,
    playbackMode,
    resetToRealtime,
    type PlaybackMode,
  } from '../stores/time.js';
  import { useLocalTime, userTimezone } from '../stores/settings.js';
  import { getUtcOffsetMs, getTimezoneAbbr } from '../utils/timezone.js';

  let time: string = $state('');
  let mode: PlaybackMode = $state('realtime');
  let localTime = $state(false);
  let tz = $state('Etc/UTC');
  let rawTime: Date = $state(new Date());

  formattedTime.subscribe((v) => (time = v));
  playbackMode.subscribe((v) => (mode = v));
  useLocalTime.subscribe((v) => (localTime = v));
  userTimezone.subscribe((v) => (tz = v));
  currentTime.subscribe((v) => (rawTime = v));

  function formatLocal(d: Date, timeZone: string): string {
    const offsetMs = getUtcOffsetMs(d, timeZone);
    const local = new Date(d.getTime() + offsetMs);
    const pad = (n: number, digits = 2) => n.toString().padStart(digits, '0');
    const abbr = getTimezoneAbbr(d, timeZone);
    return (
      `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())} ` +
      `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())} ${abbr}`
    );
  }

  let displayTime = $derived(localTime ? formatLocal(rawTime, tz) : time);
</script>

<div class="time-display-row" aria-live="polite">
  <span class="time-display" class:simulated={mode !== 'realtime'}>{displayTime}</span>
  <button class="btn btn-now" onclick={resetToRealtime} aria-label="Reset to real time" title="Reset to real time">
    Now
  </button>
</div>

<style>
  .time-display-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .time-display {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  }

  .time-display.simulated {
    color: var(--color-accent);
  }

  .btn-now {
    margin-left: auto;
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: var(--color-bg);
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    cursor: pointer;
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    transition: background-color 0.15s, color 0.15s;
  }

  .btn-now:hover {
    color: var(--color-text);
    border-color: var(--color-text-muted);
  }

  .btn-now:active {
    background: var(--color-border);
  }
</style>

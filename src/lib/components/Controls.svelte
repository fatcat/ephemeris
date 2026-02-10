<script lang="ts">
  import {
    playbackMode,
    playbackSpeed,
    snapInterval,
    isPlaying,
    SMOOTH_SPEEDS,
    SNAP_INTERVALS,
    type PlaybackMode,
  } from '../stores/time.js';
  const positiveSmoothSpeeds = SMOOTH_SPEEDS.filter((s) => s > 0);
  const positiveSnapIntervals = SNAP_INTERVALS.filter((s) => s > 0);

  let mode: PlaybackMode = $state('realtime');
  let playing: boolean = $state(true);
  let speed: number = $state(1);
  let interval: number = $state(1);
  let reverse: boolean = $state(false);
  let lastSelectedMode: 'smooth' | 'snap' = $state('smooth');

  playbackMode.subscribe((v) => {
    mode = v;
    if (v === 'smooth' || v === 'snap') lastSelectedMode = v;
  });
  isPlaying.subscribe((v) => (playing = v));
  playbackSpeed.subscribe((v) => {
    reverse = v < 0;
    speed = Math.abs(v);
  });
  snapInterval.subscribe((v) => {
    reverse = v < 0;
    interval = Math.abs(v);
  });

  function ensureNonRealtime() {
    if (mode === 'realtime') {
      playbackMode.set(lastSelectedMode);
      if (lastSelectedMode === 'smooth') {
        playbackSpeed.set(reverse ? -speed : speed);
      } else {
        snapInterval.set(reverse ? -interval : interval);
      }
    }
  }

  function togglePlay() {
    ensureNonRealtime();
    isPlaying.update((v) => !v);
  }

  function rewind() {
    ensureNonRealtime();
    if (!reverse) {
      reverse = true;
      if (mode === 'smooth') playbackSpeed.update((v) => -Math.abs(v));
      if (mode === 'snap') snapInterval.update((v) => -Math.abs(v));
    }
    isPlaying.set(true);
  }

  function fastForward() {
    ensureNonRealtime();
    if (reverse) {
      reverse = false;
      if (mode === 'smooth') playbackSpeed.update((v) => Math.abs(v));
      if (mode === 'snap') snapInterval.update((v) => Math.abs(v));
    }
    isPlaying.set(true);
  }

  function setMode(newMode: 'smooth' | 'snap') {
    playbackMode.set(newMode);
    if (newMode === 'smooth') {
      playbackSpeed.set(reverse ? -speed : speed);
    } else {
      snapInterval.set(reverse ? -interval : interval);
    }
    isPlaying.set(true);
  }

  function selectSpeed(s: number) {
    speed = s;
    playbackSpeed.set(reverse ? -s : s);
  }

  function selectInterval(d: number) {
    interval = d;
    snapInterval.set(reverse ? -d : d);
  }

  /** Whether the play/pause button should show pause */
  function showPause(): boolean {
    return mode === 'realtime' || playing;
  }
</script>

<div class="controls" role="toolbar" aria-label="Time controls">
  <div class="controls-row controls-transport">
    <button class="btn btn-transport" onclick={rewind} aria-label="Rewind" title="Rewind">
      &lt;&lt;
    </button>

    <button class="btn btn-transport btn-play" onclick={togglePlay} aria-label={showPause() ? 'Pause' : 'Play'}>
      {showPause() ? '||' : '\u25B6'}
    </button>

    <button class="btn btn-transport" onclick={fastForward} aria-label="Fast forward" title="Fast forward">
      &gt;&gt;
    </button>

    <div class="labeled-group">
      <span class="group-label">Time Mode</span>
      <div class="mode-toggle">
        <button class="btn btn-mode" class:active={lastSelectedMode === 'smooth'} onclick={() => setMode('smooth')}>
          Smooth
        </button>
        <button class="btn btn-mode" class:active={lastSelectedMode === 'snap'} onclick={() => setMode('snap')}>
          Snap
        </button>
      </div>
    </div>
  </div>

  {#if lastSelectedMode === 'smooth'}
    <div class="controls-row controls-speeds" role="group" aria-label="Speed selector">
      {#each positiveSmoothSpeeds as s (s)}
        <button
          class="btn btn-speed"
          class:active={speed === s}
          onclick={() => selectSpeed(s)}
        >
          {s}x
        </button>
      {/each}
    </div>
  {:else}
    <div class="controls-row controls-speeds" role="group" aria-label="Interval selector">
      {#each positiveSnapIntervals as d (d)}
        <button
          class="btn btn-speed"
          class:active={interval === d}
          onclick={() => selectInterval(d)}
        >
          {d}d
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .controls {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .controls-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .btn {
    background: var(--color-bg);
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;
    font-family: inherit;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  .btn:hover {
    color: var(--color-text);
    border-color: var(--color-text-muted);
  }

  .btn:active {
    background: var(--color-border);
  }

  .btn.active {
    background: var(--color-accent);
    color: var(--color-bg);
    border-color: var(--color-accent);
  }

  .btn-transport {
    min-width: 2rem;
    height: 2rem;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: -0.05em;
  }

  .btn-play {
    min-width: 2.4rem;
    height: 2.4rem;
    border-radius: 50%;
    font-size: 1rem;
  }

  .btn-mode {
    padding: 0.3rem 0.5rem;
    font-size: 0.65rem;
  }

  .labeled-group {
    margin-left: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
  }

  .group-label {
    font-size: 0.55rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .mode-toggle {
    display: flex;
    gap: 1px;
  }

  .mode-toggle .btn:first-child {
    border-radius: 6px 0 0 6px;
  }

  .mode-toggle .btn:last-child {
    border-radius: 0 6px 6px 0;
  }

  .controls-speeds {
    gap: 0.35rem;
  }

  .btn-speed {
    padding: 0.3rem 0.45rem;
    font-size: 0.7rem;
    font-variant-numeric: tabular-nums;
    min-width: 2rem;
    text-align: center;
  }
</style>

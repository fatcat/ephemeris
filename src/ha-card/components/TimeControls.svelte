<script lang="ts">
  import type { Controls } from '../config.js';
  import { formatMinutes } from '../format.js';
  import type { HomeContext } from '../home.js';
  import type { TimeSelection } from '../timeSelection.svelte.js';
  import Chip from './Chip.svelte';
  import ChipGroup from './ChipGroup.svelte';

  let {
    selection,
    controls,
    home,
    now,
  }: { selection: TimeSelection; controls: Controls; home: HomeContext; now: Date } = $props();

  const sliderId = `time-${Math.random().toString(36).slice(2, 8)}`;

  let minutes = $derived(selection.minutes(now, home.timeZone));
  let days = $derived(selection.dayOptions(now, home));
</script>

{#if controls !== 'none'}
  <div class="time-controls">
    {#if controls === 'full'}
      <ChipGroup
        label="Day"
        options={days}
        selected={selection.day()}
        onpick={(id) => selection.pickDay(id, now, home.timeZone)}
      />
    {/if}

    <div class="time-row">
      <button
        type="button"
        class="icon-button"
        aria-label={selection.moving ? 'Pause' : 'Play the day'}
        onclick={() => selection.togglePlay(now, home.timeZone)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          {#if selection.moving}
            <line x1="8" y1="5" x2="8" y2="19" />
            <line x1="16" y1="5" x2="16" y2="19" />
          {:else}
            <polygon points="7,4 20,12 7,20" />
          {/if}
        </svg>
      </button>

      {#if controls === 'full'}
        <label for={sliderId}>Time</label>
        <input
          id={sliderId}
          type="range"
          min="0"
          max="1435"
          step="5"
          value={Math.floor(minutes / 5) * 5}
          aria-valuetext={formatMinutes(minutes, home)}
          oninput={(e) => selection.setMinutes(Number(e.currentTarget.value))}
        />
      {/if}

      <span class="clock">{formatMinutes(minutes, home)}</span>

      {#if !selection.live}
        <Chip label="Now" onclick={() => selection.goLive()} />
      {/if}
    </div>
  </div>
{/if}

<style>
  .time-controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .icon-button:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  .time-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .icon-button {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 22px;
    border: none;
    background: var(--secondary-background-color, rgba(127, 127, 127, 0.12));
    color: var(--primary-text-color);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .icon-button svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  label {
    font-size: 12px;
    color: var(--secondary-text-color);
  }

  input[type='range'] {
    flex: 1;
    min-width: 0;
    height: 44px;
    margin: 0;
    accent-color: var(--primary-color);
  }

  .clock {
    font-size: 15px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

</style>

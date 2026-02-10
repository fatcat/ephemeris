<script lang="ts">
  import { currentTime, setTime } from '../stores/time.js';
  import { findEquinoxOrSolstice } from '../astronomy/solar.js';

  let year: number = $state(new Date().getUTCFullYear());

  currentTime.subscribe((t) => {
    year = t.getUTCFullYear();
  });

  const presets = $derived([
    { label: 'Mar Eq', date: findEquinoxOrSolstice(year, 0) },
    { label: 'Jun Sol', date: findEquinoxOrSolstice(year, 90) },
    { label: 'Sep Eq', date: findEquinoxOrSolstice(year, 180) },
    { label: 'Dec Sol', date: findEquinoxOrSolstice(year, 270) },
  ]);

  function jumpTo(date: Date) {
    setTime(date);
  }
</script>

<div class="presets" role="group" aria-label="Astronomical date presets">
  {#each presets as p (p.label)}
    <button class="btn-preset" onclick={() => jumpTo(p.date)}>
      {p.label}
    </button>
  {/each}
</div>

<style>
  .presets {
    display: flex;
    gap: 0.3rem;
  }

  .btn-preset {
    flex: 1;
    background: var(--color-surface);
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.25rem 0.2rem;
    font-size: 0.65rem;
    text-align: center;
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;
    font-family: inherit;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  .btn-preset:hover {
    color: var(--color-text);
    border-color: var(--color-accent);
  }

  .btn-preset:active {
    background: var(--color-border);
  }
</style>

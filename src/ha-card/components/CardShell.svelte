<script lang="ts">
  import { onDestroy, type Snippet } from 'svelte';
  import type { CardState } from '../cardState.svelte.js';
  import { formatNumber } from '../format.js';
  import { TimeSelection } from '../timeSelection.svelte.js';
  import CardHeader from './CardHeader.svelte';
  import InfoBoxes from './InfoBoxes.svelte';
  import TimeControls from './TimeControls.svelte';

  let { state, chart }: { state: CardState; chart: Snippet<[Date]> } = $props();

  const selection = new TimeSelection();
  onDestroy(() => selection.dispose());

  $effect(() => {
    if (!state.config) return;
    // Controls off means always now
    if (state.config.controls === 'none') selection.goLive();
    selection.setResetAfter(state.config.resetAfter);
  });

  let home = $derived(state.home);
  let config = $derived(state.config);
  let instant = $derived(home ? selection.instant(state.now, home.timeZone) : state.now);

  let title = $derived(config?.title === undefined ? state.defaultTitle : config.title);
  let subtitle = $derived(
    home
      ? `Home · ${formatNumber(Math.abs(home.lat), home, 1)}° ${home.lat >= 0 ? 'N' : 'S'}`
      : '',
  );

  let items = $derived(
    home && config
      ? config.info.map((id) => ({
          id,
          label: state.infoDefs[id].label,
          value: state.infoDefs[id].value({ instant, home }),
        }))
      : [],
  );
</script>

<ha-card>
  <div class="card-body">
    {#if title !== false}
      <CardHeader {title} {subtitle} />
    {/if}

    {#if !config}
      <p class="card-note">Waiting for card config.</p>
    {:else if !home}
      <p class="card-note">
        Waiting for the home location. Set it under Settings, System, General in Home Assistant.
      </p>
    {:else}
      {@render chart(instant)}
      <InfoBoxes {items} />
      <TimeControls {selection} controls={config.controls} {home} now={state.now} />
    {/if}
  </div>
</ha-card>

<style>
  .card-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: var(--primary-text-color);
    font-family: var(--ha-font-family-body, inherit);
  }

  .card-note {
    margin: 0;
    font-size: 14px;
    color: var(--secondary-text-color);
  }
</style>

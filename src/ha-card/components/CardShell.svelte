<script lang="ts">
  import { onDestroy, type Snippet } from 'svelte';
  import type { CardState } from '../cardState.svelte.js';
  import { PATH_COLORS, PATH_COLORS_ON_LIGHT, cssHex } from '../../lib/pathColors.js';
  import { formatLatitude } from '../format.js';
  import { TimeSelection } from '../timeSelection.svelte.js';
  import CardHeader from './CardHeader.svelte';
  import InfoBoxes from './InfoBoxes.svelte';
  import TimeControls from './TimeControls.svelte';

  let {
    cardState,
    chart,
    controls,
  }: {
    cardState: CardState;
    chart: Snippet<[Date]>;
    /** Card-specific controls, shown above the time controls when controls are `full` */
    controls?: Snippet;
  } = $props();

  const selection = new TimeSelection();
  onDestroy(() => selection.dispose());

  $effect(() => {
    if (!cardState.config) return;
    // Controls off means always now
    if (cardState.config.controls === 'none') selection.goLive();
    selection.setResetAfter(cardState.config.resetAfter);
  });

  let home = $derived(cardState.home);
  let config = $derived(cardState.config);
  let instant = $derived(home ? selection.instant(cardState.now, home.timeZone) : cardState.now);

  // Path and sun colors as CSS variables, darker on light themes for contrast
  let colorVars = $derived(
    Object.entries(home?.dark ? PATH_COLORS : PATH_COLORS_ON_LIGHT)
      .map(([k, v]) => `--ephemeris-${k}-color: ${cssHex(v)}`)
      .join('; '),
  );

  let title = $derived(config?.title === undefined ? cardState.defaultTitle : config.title);
  let subtitle = $derived(home ? `Home · ${formatLatitude(home.lat, home)}` : '');

  let items = $derived(
    home && config
      ? config.info.map((id) => ({
          id,
          label: cardState.infoDefs[id].label,
          value: cardState.infoDefs[id].value({ instant, home, card: config.card }),
        }))
      : [],
  );
</script>

<ha-card>
  <div class="card-body" style={colorVars}>
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
      {#if config.controls === 'full'}{@render controls?.()}{/if}
      <TimeControls {selection} controls={config.controls} {home} now={cardState.now} />
    {/if}
  </div>
</ha-card>

<style>
  .card-body {
    /* The sun marker, the same on every theme */
    --ephemeris-sun-color: #f6c445;
    --ephemeris-sun-edge-color: #b7860b;
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

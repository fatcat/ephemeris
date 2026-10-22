<script lang="ts">
  import type { ChartOrientation } from '../../lib/astronomy/polarChart.js';
  import type { CardState } from '../cardState.svelte.js';
  import CardShell from '../components/CardShell.svelte';
  import ChipGroup from '../components/ChipGroup.svelte';
  import SkyChart from './SkyChart.svelte';
  import type { SkyConfig } from './skyConfig.js';

  let { cardState }: { cardState: CardState } = $props();

  // parseSkyConfig produced this, so the cast holds
  let sky = $derived(cardState.config?.card as SkyConfig | undefined);

  // The in-card toggle overrides this until the config changes again
  let orientation = $derived<ChartOrientation>(sky?.orientation ?? 'north_up');

  const ORIENTATION_OPTIONS: { id: ChartOrientation; label: string }[] = [
    { id: 'north_up', label: 'North up' },
    { id: 'facing_sun', label: 'Facing the sun' },
  ];
</script>

<CardShell {cardState}>
  {#snippet chart(instant)}
    {#if sky && cardState.home}
      <SkyChart home={cardState.home} {instant} {sky} {orientation} />
    {/if}
  {/snippet}
  {#snippet controls()}
    <ChipGroup
      label="Chart orientation"
      options={ORIENTATION_OPTIONS}
      selected={orientation}
      onpick={(id) => (orientation = id)}
    />
  {/snippet}
</CardShell>

<script lang="ts">
  import type { CardState } from '../cardState.svelte.js';
  import CardShell from '../components/CardShell.svelte';
  import DayNightMap from './DayNightMap.svelte';
  import type { DayNightConfig } from './dayNightConfig.js';
  import type { PersonMarker } from './people.js';

  let { cardState }: { cardState: CardState } = $props();

  // parseDayNightConfig and peopleFromHass produced these, so the casts hold
  let map = $derived(cardState.config?.card as DayNightConfig | undefined);
  let people = $derived((cardState.hassData as PersonMarker[] | null) ?? []);
</script>

<CardShell {cardState}>
  {#snippet chart(instant)}
    {#if map && cardState.home}
      <DayNightMap home={cardState.home} {instant} {map} {people} />
    {/if}
  {/snippet}
</CardShell>

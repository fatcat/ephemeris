<script lang="ts">
  import type { CardState } from '../cardState.svelte.js';
  import CardShell from '../components/CardShell.svelte';
  import ChartPlaceholder from '../components/ChartPlaceholder.svelte';

  let { cardState }: { cardState: CardState } = $props();
</script>

<CardShell {cardState}>
  {#snippet chart()}
    <ChartPlaceholder label="Day and night map (Phase 11)" aspect="2" />
  {/snippet}
</CardShell>

<script lang="ts">
  import type { CardState } from '../cardState.svelte.js';
  import CardShell from '../components/CardShell.svelte';
  import ChartPlaceholder from '../components/ChartPlaceholder.svelte';

  let { state }: { state: CardState } = $props();
</script>

<CardShell {state}>
  {#snippet chart()}
    <ChartPlaceholder label="Day and night map (Phase 11)" aspect="2" />
  {/snippet}
</CardShell>

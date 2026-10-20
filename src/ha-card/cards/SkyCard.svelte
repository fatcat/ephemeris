<script lang="ts">
  import type { CardState } from '../cardState.svelte.js';
  import CardShell from '../components/CardShell.svelte';
  import ChartPlaceholder from '../components/ChartPlaceholder.svelte';

  let { state }: { state: CardState } = $props();
</script>

<CardShell {state}>
  {#snippet chart()}
    <ChartPlaceholder label="Sun path chart (Phase 10)" aspect="1" />
  {/snippet}
</CardShell>

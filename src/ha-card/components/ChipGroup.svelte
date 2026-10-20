<script lang="ts" generics="T extends string">
  import Chip from './Chip.svelte';

  let {
    label,
    options,
    selected,
    onpick,
  }: {
    /** Accessible name of the group */
    label: string;
    options: { id: T; label: string }[];
    selected: T;
    onpick: (id: T) => void;
  } = $props();
</script>

<div class="chip-group" role="group" aria-label={label}>
  {#each options as o (o.id)}
    <Chip label={o.label} pressed={o.id === selected} onclick={() => onpick(o.id)} />
  {/each}
</div>

<style>
  .chip-group {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
</style>

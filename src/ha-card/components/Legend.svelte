<script lang="ts" module>
  export interface LegendItem {
    name: string;
    color: string;
    /** Line for paths, box for areas, dot for points */
    swatch: 'line' | 'box' | 'dot';
  }
</script>

<script lang="ts">
  let { label, items }: { label: string; items: LegendItem[] } = $props();
</script>

{#if items.length}
  <ul class="legend" aria-label={label}>
    {#each items as item (item.name)}
      <li><span class="swatch {item.swatch}" style:background={item.color}></span>{item.name}</li>
    {/each}
  </ul>
{/if}

<style>
  .legend {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px 16px;
    font-size: 12px;
    color: var(--secondary-text-color);
  }

  li {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .swatch {
    flex-shrink: 0;
  }

  .line {
    width: 16px;
    height: 4px;
    border-radius: 2px;
  }

  .box {
    width: 16px;
    height: 10px;
    border-radius: 2px;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 6px;
  }
</style>

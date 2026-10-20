<script lang="ts">
  let { items }: { items: { id: string; label: string; value: string }[] } = $props();
</script>

{#if items.length}
  <div class="info-wrap">
  <dl class="info-boxes">
    {#each items as item (item.id)}
      <div class="info-box">
        <dt>{item.label}</dt>
        <dd>{item.value}</dd>
      </div>
    {/each}
  </dl>
  </div>
{/if}

<style>
  /* An element can't query its own width, so the wrapper is the container */
  .info-wrap {
    container-type: inline-size;
  }

  .info-boxes {
    margin: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .info-box {
    background: var(--secondary-background-color, rgba(127, 127, 127, 0.12));
    border-radius: 8px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  dt {
    font-size: 11px;
    color: var(--secondary-text-color);
  }

  dd {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }

  @container (max-width: 340px) {
    dd {
      font-size: 14px;
    }
  }

  @container (max-width: 280px) {
    .info-boxes {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>

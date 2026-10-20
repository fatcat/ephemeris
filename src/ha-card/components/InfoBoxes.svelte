<script lang="ts">
  import type { InfoValue } from '../info.js';

  let { items }: { items: { id: string; label: string; value: InfoValue }[] } = $props();
</script>

{#if items.length}
  <div class="info-wrap">
  <dl class="info-boxes">
    {#each items as item (item.id)}
      <div class="info-box" class:wide={typeof item.value !== 'string'}>
        <dt>{item.label}</dt>
        {#if typeof item.value === 'string'}
          <dd>{item.value}</dd>
        {:else}
          {#each item.value.rows as row, i (i)}
            <dd class="info-row">
              <span class="info-row-text"><span class="row-name" title={row.name}>{row.name}</span><span class="pct">{row.percent}%</span></span>
              <span class="bar" aria-hidden="true"><span style:width="{row.percent}%"></span></span>
            </dd>
          {/each}
        {/if}
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
    grid-auto-flow: dense;
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
    /* Long words like "(afternoon)" hyphenate on narrow cards instead of breaking anywhere */
    overflow-wrap: break-word;
    hyphens: auto;
  }

  .info-row {
    font-size: 12px;
    font-weight: 400;
    overflow-wrap: normal;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .info-row-text {
    display: flex;
    justify-content: space-between;
    gap: 6px;
  }

  .row-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pct {
    font-weight: 600;
    white-space: nowrap;
  }

  .bar {
    display: block;
    height: 4px;
    border-radius: 2px;
    background: var(--divider-color, rgba(127, 127, 127, 0.3));
    overflow: hidden;
  }

  .bar > span {
    display: block;
    height: 100%;
    background: var(--ephemeris-today-color, var(--primary-color));
  }

  @container (max-width: 340px) {
    dd {
      font-size: 14px;
    }

    /* Panel names need the room more than the box needs to stay square */
    .wide {
      grid-column: 1 / -1;
    }
  }

  @container (max-width: 280px) {
    .info-boxes {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>

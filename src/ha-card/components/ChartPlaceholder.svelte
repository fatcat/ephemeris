<script lang="ts">
  // Stands in for a card's chart until its phase draws one
  let { label, aspect }: { label: string; aspect: string } = $props();
</script>

<div class="chart-placeholder" style:aspect-ratio={aspect}>{label}</div>

<style>
  .chart-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed var(--divider-color, rgba(127, 127, 127, 0.4));
    border-radius: 8px;
    font-size: 13px;
    color: var(--secondary-text-color);
  }
</style>

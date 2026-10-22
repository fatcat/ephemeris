<script lang="ts">
  let { title, subtitle }: { title: string; subtitle: string } = $props();
</script>

<header class="card-header">
  <h2>{title}</h2>
  <span class="subtitle">{subtitle}</span>
</header>

<style>
  .card-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 500;
    line-height: 1.3;
  }

  .subtitle {
    font-size: 13px;
    color: var(--secondary-text-color);
    white-space: nowrap;
  }
</style>

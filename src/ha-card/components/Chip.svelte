<script lang="ts">
  let {
    label,
    pressed,
    onclick,
  }: { label: string; pressed?: boolean; onclick: () => void } = $props();
</script>

<button type="button" class="chip" aria-pressed={pressed} {onclick}>{label}</button>

<style>
  .chip {
    min-height: 44px;
    padding: 0 14px;
    flex-shrink: 0;
    border-radius: 22px;
    border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.4));
    background: var(--secondary-background-color, transparent);
    color: var(--primary-text-color);
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }

  .chip[aria-pressed='true'] {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: var(--text-primary-color, #fff);
  }

  .chip:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }
</style>

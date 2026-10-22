<script lang="ts" module>
  export interface Pin {
    id: string;
    name: string;
    /** Share of the box's width and height, 0 to 1 */
    left: number;
    top: number;
    home: boolean;
  }
</script>

<script lang="ts">
  let { pins, sun }: { pins: Pin[]; sun: { left: number; top: number } | null } = $props();

  /** Past this share of the width, a label goes on the left of its dot */
  const FLIP_LABEL_AT = 0.8;

  const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
</script>

<!-- Dots and labels sit over the map or globe as HTML, so they keep their size at any width -->
{#if sun}
  <span class="sun" style:left={pct(sun.left)} style:top={pct(sun.top)} aria-hidden="true"></span>
{/if}

{#each pins as p (p.id)}
  <span
    class="pin"
    class:home={p.home}
    class:flip={p.left > FLIP_LABEL_AT}
    style:left={pct(p.left)}
    style:top={pct(p.top)}
    aria-hidden="true"
  >
    <span class="dot"></span>
    <span class="pin-label">{p.name}</span>
  </span>
{/each}

<style>
  .sun {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--ephemeris-sun-color);
    border: 1.5px solid var(--ephemeris-sun-edge-color);
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--ephemeris-sun-color) 30%, transparent);
  }

  .pin {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 4px;
    /* Center on the dot, not on dot plus label */
    transform: translate(-6px, -50%);
  }

  .pin.flip {
    flex-direction: row-reverse;
    transform: translate(calc(-100% + 6px), -50%);
  }

  .dot {
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    border-radius: 50%;
    background: #ffffff;
    border: 2px solid #1c1c1c;
  }

  .home .dot {
    background: var(--primary-color, #03a9f4);
  }

  .pin-label {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    color: #ffffff;
    text-shadow:
      0 0 3px #1c1c1c,
      0 0 2px #1c1c1c;
  }
</style>

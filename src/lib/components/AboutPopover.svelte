<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    onclose: () => void;
    aboutBtnEl: HTMLElement;
  }

  let { onclose, aboutBtnEl }: Props = $props();

  let popoverEl: HTMLDivElement;

  function onPointerDown(e: PointerEvent) {
    if (!popoverEl) return;
    const target = e.target as Node;
    if (!popoverEl.contains(target) && !aboutBtnEl.contains(target)) {
      onclose();
    }
  }

  onMount(() => {
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  });
</script>

<div class="about-popover" bind:this={popoverEl}>
  <div class="about-header">
    <span class="about-title">About</span>
  </div>

  <div class="about-body">
    <h2 class="about-name">Ephemeris</h2>
    <p class="about-desc">
      An educational web app for understanding why Earth has seasons. Visualizes
      the day/night terminator on a 3D globe and equirectangular projection. Also
      shows an orrery view and sundial. Driven by real solar position calculations.
    </p>
    <p class="about-desc">
      Designed for instructor-led use with students ages 8+.
    </p>

    <div class="about-links">
      <a
        href="https://github.com/fatcat/ephemeris"
        target="_blank"
        rel="noopener noreferrer"
      >GitHub Repository</a>
    </div>

    <p class="about-license">
      Released under the MIT License.
    </p>
  </div>
</div>

<style>
  .about-popover {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 50;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-top: none;
    border-radius: 0 0 6px 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    max-height: calc(100vh - 3rem);
    overflow-y: auto;
  }

  .about-header {
    padding: 0.4rem 0.8rem;
    border-bottom: 1px solid var(--color-border);
  }

  .about-title {
    font-size: 0.6rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .about-body {
    padding: 0.6rem 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .about-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    letter-spacing: 0.1em;
    margin: 0;
  }

  .about-desc {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    line-height: 1.4;
    margin: 0;
  }

  .about-links {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .about-links a {
    font-size: 0.7rem;
    color: var(--color-accent);
    text-decoration: none;
  }

  .about-links a:hover {
    text-decoration: underline;
  }

  .about-license {
    font-size: 0.65rem;
    color: var(--color-text-muted);
    margin: 0;
  }
</style>

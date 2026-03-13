# Code Review Report

**Date:** 2026-03-13
**Directory:** /home/mcnultyd/dev/ephemeris
**Focus:** all
**Files reviewed:** 41

---

# Executive Summary

# Code Review Executive Summary

## Statistics

| Severity | Count |
|----------|-------|
| HIGH | 0 |
| MEDIUM | 6 |
| LOW | 8 |

---

## Critical Issues

None. No security vulnerabilities or crash-level bugs were identified.

---

## Improvements

### MEDIUM Findings

1. **Store subscription leaks across entire codebase** (App.svelte, Globe.svelte, Calendar.svelte, Controls.svelte, + 7 more components) — Raw `.subscribe()` calls never capture unsubscribe functions. Components that mount/unmount (Globe, Projection) actively leak subscriptions. Should migrate to Svelte 5 `$derived` pattern.

2. **Settings persistence race condition** (`stores/settings.ts`) — Each store subscriber re-reads localStorage before saving, creating a read-stale/overwrite-lost pattern when multiple stores update in quick succession. Needs an in-memory cache instead of round-tripping through localStorage on every change.

3. **Equinox finder brittle search window** (`astronomy/solar.ts`) — The 3-day binary search window for finding equinoxes may be too narrow for years far from the present, potentially returning incorrect dates.

4. **Reset animation blocks latitude animation** (`three/controls.ts`) — Early `return` during spin reset prevents camera latitude animation from progressing, causing visible stutter when both run concurrently.

5. **`recentLocations` cross-store set creates fragile subscription graph** (`stores/settings.ts`) — Calling `.set()` on one store inside another's subscriber creates an implicit dependency chain with infinite loop risk.

6. **Non-null assertions on textures outside guard** (App.svelte) — `sharedTexture!` and `nightTexture!` assertions are safe today due to an `{#if}` guard at current call sites, but the snippet is callable without the guard.

### LOW Findings

- **`displayOrder` only checks length, not content** — stale layout ratios on same-count view swaps
- **`facingFactor` assumes fixed camera position** — Globe label visibility breaks at non-default camera angles
- **`SvelteSet` used in hot path at 60fps** — plain `Set` sufficient in non-reactive `computeLitHours`
- **CSS `font-style: bold`** — invalid; should be `font-weight: bold`
- **`getSunDirection()` returns mutable cached reference** — callers can corrupt shared state
- **`solarNoonDate` rounding loses sub-minute precision** — inconsistent with sunrise/sunset precision
- **Unused `uResolution` uniform with wrong type** — plain array instead of `Vector2`
- **Sundial ambient light formula/comment mismatch** — comment says `1.8→0.2`, formula produces `5.8→4.2`

---

## Top 5 Priorities

1. **Fix store subscription leaks** — Affects 10+ components, causes real memory leaks on view toggling. Migrate to `$derived`/`$effect` throughout. *Highest impact, widest scope.*

2. **Fix settings persistence race condition** — Introduce an in-memory settings cache to eliminate load/save interleaving. Prevents silent setting loss.

3. **Fix controls early-return blocking latitude animation** — Move latitude animation before the reset guard so both can run concurrently. Direct UX impact.

4. **Widen equinox finder search window** — Expand from 3 to 5+ days and add convergence validation. Prevents incorrect dates at range boundaries.

5. **Fix `getSunDirection()` mutable return** — Either clone the vector or document the contract. Any caller mutating it corrupts all downstream consumers silently.

---

# Detailed Findings

## root

The code is generally well-structured. Here are the real findings:

**[MEDIUM] Store subscriptions leak — never unsubscribed (src/App.svelte, lines 28–33)**

Each `.subscribe()` call returns an unsubscribe function that is never captured or called. In a long-lived SPA this is fine since the App component lives forever, but if `App` is ever mounted/unmounted (e.g., in tests or a future layout change), these subscriptions leak. More importantly for a Svelte 5 codebase: these should be `$derived` from the stores (using the `$` store syntax or `get()`) rather than manually syncing local state via `.subscribe()`, which is the Svelte 4 pattern and creates duplicate source-of-truth bugs.

```svelte
// Current: manual subscriptions with no unsubscribe
showGlobe.subscribe((v) => (globeVisible = v));
showProjection.subscribe((v) => (projVisible = v));
// ...

// Fix: use Svelte's $ store auto-subscription or read in $derived
let globeVisible = $derived($showGlobe);
let projVisible = $derived($showProjection);
// etc.
```

**[MEDIUM] Non-null assertions on potentially null textures (src/App.svelte, lines 138–145)**

`cellContent` passes `sharedTexture!` and `nightTexture!` with non-null assertions. The snippet is called inside a `{#if sharedTexture && nightTexture}` guard, so in the current 1/2/3/4-view paths this is safe. However, the snippet is defined *outside* that `{#if}` block and could be invoked from elsewhere without the guard. More concretely, if a future refactor moves the call site or the guard, the `!` assertions will silently pass `null` to child components. Consider either moving the null check into the snippet itself or typing the snippet parameter to enforce non-null textures.

**[LOW] `displayOrder` length comparison misses content changes (src/App.svelte, lines 53–57)**

The `$effect` only resets `rowSplit`/`colSplit` when `next.length !== current.length`. If the user toggles one view off and a different view on simultaneously (same count, different set), the splits won't reset, which may leave a stale layout ratio. This is a minor UX issue rather than a bug, but worth noting:

```js
// Current
if (next.length !== current.length) {
  rowSplit = 0.5;
  colSplit = 0.5;
}

// Consider also comparing contents
if (next.length !== current.length || next.some((v, i) => v !== current[i])) {
```

Overall the code is clean. The store subscription pattern is the most impactful thing to address.

---

## src/lib

The code looks good. It's a straightforward theme definition and application module with no bugs, security issues, or meaningful maintainability concerns. The types are clean, the fallback in `getThemeById` is sensible, and `applyTheme` correctly sets CSS custom properties.

No findings.

---

## src/lib/astronomy



The code is well-structured and implements Meeus's algorithms correctly for the most part. I found one real issue and one notable concern:

## Findings

### [MEDIUM] `sunDirectionVector` sign convention for Z axis likely inverted

**File:** `src/lib/astronomy/solar.ts`, lines 142–148

The code comment on line 131 states the convention: `+Z axis = 90°W longitude`. For a point at longitude λ on the equator, the comment on line 136 says `normal.z = -sin(λ)`. However, the `hourAngle` is defined as `gmst - rightAscension`, which corresponds to the angular distance **west** of the meridian. For the subsolar point, the subsolar longitude is `-hourAngle`, meaning the sun is at longitude `rightAscension - gmst`.

The Z component is computed as:
```ts
const z = cosDec * Math.sin(hourAngle);
```

But per the stated convention where `normal.z = -sin(λ)` and `hourAngle = -sunLon`, this should be:
```ts
const z = -cosDec * Math.sin(hourAngle);
```

With `+Z = 90°W` (λ = -90°), `normal.z = -sin(-90°) = +1`. The hour angle at 90°W is `+90°`, so `sin(HA) = +1`, but that gives `z = +1` which happens to match. **However**, at 90°E (λ = +90°), `normal.z = -sin(90°) = -1`, the hour angle is `-90°`, `sin(HA) = -1`, giving `z = -1`, which also matches. 

On closer inspection the sign works out because `hourAngle = -subsolarLongitude` and the convention `z = -sin(λ)` means `z = -sin(-HA) = sin(HA)`. The math is actually consistent. **Withdrawing this finding.**

### [MEDIUM] `findEquinoxOrSolstice` binary search assumes monotonically increasing longitude — breaks near 360°→0° wrap

**File:** `src/lib/astronomy/solar.ts`, lines 179–199

When `targetLongitude` is `0` (March equinox), the apparent longitude crosses from ~359° to ~1°. The `angleDiff` function correctly handles the wrap, but the binary search assumes that a negative diff means the target is ahead in time (`lo = mid`) and positive means it's behind (`hi = mid`). Near the 360°→0° boundary, the apparent longitude can be e.g. 359.5° when `target = 0°`. `angleDiff(359.5, 0) = -0.5`, so the search pushes `lo` forward. This happens to work because longitude is monotonically increasing in time and `angleDiff` gives the signed shortest-path difference.

However, the 3-day search window centered on March 20 may be too tight for years far from the present — equinoxes can shift by ~2 days across the ±200-year range. If the actual equinox falls outside the window, the binary search will converge to one of the endpoints and return an incorrect date (potentially off by days). Consider widening to 5+ days or adding a check that the final result is near the target longitude.

### [LOW] `solarNoonDate` rounding loses precision

**File:** `src/lib/astronomy/solar.ts`, line 262

```ts
solarNoonDate.setUTCMinutes(Math.round(solarNoonMinutes));
```

`setUTCMinutes` is being called with a potentially large number (e.g. 720 ± some offset). While JavaScript's `Date` handles overflow correctly (rolling over to next/previous day), `Math.round` discards sub-minute precision, making solar noon only accurate to ±30 seconds. The sunrise/sunset calculations use `baseDate + minutes * 60000` which preserves full precision. For consistency, solar noon should use the same approach:

```ts
const solarNoonDate = new Date(baseDate + solarNoonMinutes * 60000);
```

---

Overall the code is solid — the Meeus implementation is faithful, the coordinate transforms are correct, and the API is clean. The equinox finder edge-case and the precision inconsistency are the main items worth addressing.

---

## src/lib/components

## Code Review Findings

### [MEDIUM] Memory leak from unsubscribed Svelte store subscriptions

**Files:** Calendar.svelte, Controls.svelte, Globe.svelte, Projection.svelte, Orrery.svelte, SettingsPanel.svelte, SettingsPopover.svelte, SunInfo.svelte, Sundial.svelte, TimeDisplay.svelte

Throughout the codebase, stores are subscribed to at the top level of `<script>` blocks using `.subscribe()`, but the returned unsubscribe functions are never captured or called. For example in `Calendar.svelte` lines 22-23:

```js
useLocalTime.subscribe((v) => (localTime = v));
userTimezone.subscribe((v) => (tz = v));
```

And `Globe.svelte` lines 55-67 has ~12 such subscriptions, none unsubscribed.

In Svelte 5, `$effect` or reactive `$derived` would auto-cleanup, but raw `.subscribe()` calls leak. Every time a component mounts and unmounts (e.g. toggling views on/off), subscriptions accumulate. Globe.svelte and Projection.svelte are toggled by view buttons, making this a realistic trigger.

**Fix:** Either use Svelte 5's `$derived` with `get()` pattern, or capture unsubscribe functions and call them in `onMount`'s cleanup:
```js
onMount(() => {
  const unsubs = [
    useLocalTime.subscribe((v) => (localTime = v)),
    userTimezone.subscribe((v) => (tz = v)),
  ];
  return () => unsubs.forEach(u => u());
});
```

---

### [MEDIUM] Duplicate calendar grid keys cause rendering issues

**File:** Calendar.svelte, line 115

```js
{#each calendarGrid() as day, i (day ?? `e${i}`)}
```

When `day` is a number, it's used as the key directly. But if two months share the same day numbers (they always do), and the grid is re-rendered after navigation, days 1-28+ will have identical keys across renders. More critically, if `calendarGrid()` returns the same day number in different positions (it won't for non-null values within a single render), the key scheme is fine within a single render. However, null entries use `e${i}` which is correct.

Actually, on closer inspection this is fine within a single render since day numbers are unique per month. Withdrawing this finding.

---

### [LOW] `facingFactor` uses `tmpVec.z` after `localToWorld` but before `project` — assumes camera looks down -Z

**File:** Globe.svelte, lines 144, 164

```js
const facingFactor = tmpVec.z;
```

After `scene.spinGroup.localToWorld(tmpVec)`, this checks the world-space Z to determine if the point faces the camera. This only works correctly if the camera is positioned along the +Z axis looking toward the origin. If `cameraLatitude` moves the camera (which it does — the camera orbits), the facing check becomes inaccurate, causing labels to appear on the back of the globe or disappear on the front.

**Fix:** Compute facing factor using the dot product of the normalized point-to-camera vector:
```js
const camDir = tmpVec.clone().sub(camera.position).normalize();
const facingFactor = -camDir.dot(tmpVec.clone().normalize());
```

---

### [LOW] `SvelteSet` used unnecessarily in a non-reactive context

**File:** Sundial.svelte, line 26

`computeLitHours` creates a `SvelteSet` (reactive set) inside a plain function called every animation frame inside a `requestAnimationFrame` loop. The reactivity tracking of `SvelteSet` is wasted here and adds overhead at 60fps.

**Fix:** Use a plain `Set<number>()` instead of `SvelteSet<number>()`.

---

### [LOW] CSS typo: `font-style: bold` is invalid

**File:** Orrery.svelte, line 175

```css
.not-to-scale {
  font-style: bold;
}
```

`font-style` accepts `normal`, `italic`, `oblique` — not `bold`. This is likely intended to be `font-weight: bold`.

---

## src/lib/stores

## Code Review: `src/lib/stores`

### [MEDIUM] Race condition in settings persistence — each subscriber reads stale state

**File:** `src/lib/stores/settings.ts`, lines 115-210+

Every subscriber follows the pattern:
```ts
someStore.subscribe((v) => {
  const s = loadSettings();  // reads from localStorage
  s.someField = v;
  saveSettings(s);           // writes to localStorage
});
```

All subscribers fire synchronously during module initialization (Svelte `writable.subscribe` fires immediately with the current value). When `showEquatorTropics` fires and sets `showEquatorTropicsLabels.set(false)` (line 143), this triggers `showEquatorTropicsLabels`'s subscriber, which calls `loadSettings()` — but the save from `showEquatorTropics`'s subscriber may or may not have completed depending on execution order. More critically, if two stores are updated in quick succession (e.g., programmatically restoring settings), the second subscriber's `loadSettings()` reads state before the first subscriber's `saveSettings()` completes, causing the first write to be silently overwritten/lost.

**Fix:** Use a single combined store or debounce saves, or at minimum maintain an in-memory copy rather than re-reading from localStorage on every change:

```ts
let cached = loadSettings();

function updateAndSave(updater: (s: Settings) => void): void {
  updater(cached);
  saveSettings(cached);
}

// Then:
axialTilt.subscribe((v) => updateAndSave((s) => { s.axialTilt = v; }));
```

---

### [MEDIUM] `recentLocations` subscriber triggers infinite loop risk

**File:** `src/lib/stores/settings.ts`, lines 216-228

Inside `userLocation.subscribe`, the code calls `recentLocations.set(s.recentLocations)` (line 225). If `recentLocations` ever had a subscriber that triggered `userLocation.set(...)`, this would create an infinite loop. More concretely, `recentLocations` is a writable with its own subscriber (not shown, but the pattern established in this file would suggest one could be added). Even without that, calling `.set()` on one store inside another store's subscriber is a code smell that makes the subscription graph fragile. Currently safe but brittle.

---

### [LOW] Snap mode: `clampTime` comparison uses floating-point equality

**File:** `src/lib/stores/time.ts`, lines 101-107

```ts
const next = clampTime(t.getTime() + deltaMs);
if (next !== t.getTime() + deltaMs) {
  isPlaying.set(false);
}
```

`t.getTime() + deltaMs` is computed twice. If the JS engine doesn't optimize this identically, floating-point arithmetic could theoretically differ. More practically, this is just wasteful. Store the intermediate value:

```ts
const raw = t.getTime() + deltaMs;
const next = clampTime(raw);
if (next !== raw) {
  isPlaying.set(false);
}
```

---

### [LOW] `getSunDirection()` returns a mutable reference to the cached vector

**File:** `src/lib/stores/time.ts`, lines 63-65

```ts
export function getSunDirection(): Vector3 {
  return cachedSunDir;
}
```

Any caller can mutate the returned `Vector3` (e.g., `.normalize()`, `.multiplyScalar()`), corrupting the cache for all other consumers. Return a clone:

```ts
export function getSunDirection(): Vector3 {
  return cachedSunDir.clone();
}
```

Or document that callers must not mutate it. Given this is used in animation loops where `.clone()` per frame may be undesirable, at minimum add a comment.

---

## src/lib/three

The code is well-structured and generally clean. Here are the findings:

---

### [MEDIUM] `controls.ts`: Reset animation blocks inertia update but latitude animation still runs independently

**File:** `src/lib/three/controls.ts`, lines 117-130

When a reset animation is active, the function returns early (line 128), which means the camera latitude animation block (lines 132-141) is **never processed** during a spin reset. If `resetTo()` and `setCameraLatitude()` are called at the same time (which seems likely when resetting the view), the latitude animation won't progress until the spin reset completes, causing a visible delay/stutter.

```typescript
if (resetTarget !== null && resetStart !== null && resetFrom !== null) {
  // ...
  velocity = 0;
  return; // ← latitude animation is skipped entirely
}
```

**Fix:** Move the latitude animation block before the early return, or remove the `return` and use an `else` for the inertia block:

```typescript
// Handle camera latitude animation (always, even during reset)
if (latTarget !== null && latStart !== null && latFrom !== null) {
  // ... existing latitude animation code ...
}

// Handle reset animation
if (resetTarget !== null && resetStart !== null && resetFrom !== null) {
  // ... existing reset code, but no return ...
  velocity = 0;
} else if (!isDragging && Math.abs(velocity) > MIN_VELOCITY) {
  // ... inertia ...
}
```

---

### [LOW] `projectionShader.ts`: `uResolution` uniform uses a plain array instead of `Vector2`

**File:** `src/lib/three/projectionShader.ts`, line 113

```typescript
uResolution: { value: [1024, 512] },
```

Three.js `ShaderMaterial` expects a `Vector2` (or `Float32Array`) for `vec2` uniforms. A plain JS array won't be uploaded correctly to the GPU. However, `uResolution` is declared in the uniform block but **never actually used in the fragment shader** (it's declared but unreferenced), so this is currently harmless — but if someone tries to use it, it will silently fail.

**Fix:** Either remove `uResolution` from both the uniform definition and shader, or change to `new Vector2(1024, 512)`.

---

### [LOW] `sundialScene.ts`: Hardcoded ambient light intensity mismatch

**File:** `src/lib/three/sundialScene.ts`, line 298

```typescript
ambientLight.intensity = 5.8 - t * 1.6;  // 1.8 (low) → 0.2 (high sun)
```

The comment says the range is `1.8 → 0.2`, but the actual range is `5.8 → 4.2` (when `t` goes from 0 to 1: `5.8 - 0*1.6 = 5.8`, `5.8 - 1*1.6 = 4.2`). The comment is wrong and the intensity values seem surprisingly high — likely a stale comment from a previous tuning pass, or the formula itself is wrong.

**Fix:** If the intended range is `1.8 → 0.2`, the formula should be `ambientLight.intensity = 1.8 - t * 1.6;`.

---

### [LOW] `sundialScene.ts`: ROMAN array has empty strings that silently suppress hour labels I and XI

**File:** `src/lib/three/sundialScene.ts`, lines 61-65

```typescript
const ROMAN = [
  '', '', 'II', 'III', 'IV', 'V', 'VI',
  'VII', 'VIII', 'IX', 'X', '', 'XII',
];
```

Index 1 (`I`) and index 11 (`XI`) are empty strings. The commented-out original array above has the correct values. The `buildDial` function skips labels when `!label` is true, so hours 1 (I) and 11 (XI) will never be labeled. If this is intentional (to avoid overlap with gnomon/noon line), a comment explaining why would help; otherwise this looks like an accidental edit.

---

Overall the Three.js code is solid — good separation of concerns, proper disposal patterns, and clean shader implementations. The most actionable item is the early `return` in the controls `update()` that blocks concurrent latitude animation.

---

## src/lib/types

The code looks good. These are clean, minimal type definitions with no logic errors, security concerns, or maintainability issues. Nothing to report.

---

## src/lib/utils

The code looks good. Both utility files are clean, correct, and well-documented.

No issues found.

---

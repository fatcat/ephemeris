# Phase 4 — Time Controls

## Goal

Add full time control: smooth acceleration, day-snap mode, transport controls, solstice/equinox presets, and a date/time picker. The user should be able to watch the terminator sweep through a full year in seconds.

## Context

Phase 3 is complete. The globe and equirectangular projection are synchronized and show real-time day/night with twilight. A time store drives both views.

## Implementation Prompt

> You are implementing Phase 4 of the Ephemeris project. Read `CLAUDE.md` for project context and `docs/DECISIONS.md` (D005) for the two-speed-mode design.
>
> **Your task:** Implement comprehensive time controls with two speed modes, transport controls, presets, and a date/time picker.
>
> ### Step-by-step:
>
> 1. **Extend the time store (`src/lib/stores/time.ts`):**
>
>    The time store should manage:
>    ```typescript
>    interface TimeState {
>      currentTime: Date;           // The simulated date/time (UTC)
>      playbackMode: 'realtime' | 'smooth' | 'snap';
>      playbackSpeed: number;       // Multiplier for smooth mode
>      snapInterval: number;        // Days per tick for snap mode
>      isPlaying: boolean;          // Whether time is advancing
>    }
>    ```
>
>    **Real-time mode:** `currentTime` tracks the system clock. Default on app start.
>
>    **Smooth mode:** Time advances at `playbackSpeed × real time`. The animation loop computes `deltaTime` each frame and adds `deltaTime × playbackSpeed` to `currentTime`. Available speeds: 1x, 2x, 5x, 10x, 20x, 50x, 100x. Negative values play in reverse.
>
>    **Snap mode:** Every ~1 second (or on a setInterval), advance `currentTime` by `snapInterval` days. Available intervals: 1, 2, 4, 7 days. Can also snap backward (negative interval). This mode is for watching seasonal terminator drift day-by-day.
>
>    **Time bounds:** Clamp `currentTime` to ±200 years from the current real date. If the simulation reaches a bound, pause playback.
>
> 2. **Transport controls component (`src/lib/components/Controls.svelte`):**
>
>    Build a control bar with:
>    - **Play/Pause** button (toggles `isPlaying`)
>    - **Mode toggle:** Switch between "Smooth" and "Snap" modes. Show which is active.
>    - **Speed selector (Smooth mode):** Buttons or a dropdown for speed multipliers. Show current speed. Include both forward and reverse (e.g., -10x, -5x, -2x, -1x, 1x, 2x, 5x, 10x, 20x, 50x, 100x).
>    - **Interval selector (Snap mode):** Buttons for 1d, 2d, 4d, 7d intervals. Include reverse option.
>    - **Reset to real-time** button: Sets mode back to real-time and syncs to system clock.
>    - Visual design: clean, horizontal control bar. Dark theme consistent with the app. Use icons where appropriate (play ▶, pause ⏸, etc. — use Unicode symbols, not icon libraries).
>
> 3. **Preset buttons component (`src/lib/components/Presets.svelte`):**
>
>    Quick-jump buttons for key astronomical dates:
>    - **March Equinox** (~March 20): `setTime(new Date(currentYear, 2, 20, 12, 0, 0))`
>    - **June Solstice** (~June 21): `setTime(new Date(currentYear, 5, 21, 12, 0, 0))`
>    - **September Equinox** (~Sept 22): `setTime(new Date(currentYear, 8, 22, 12, 0, 0))`
>    - **December Solstice** (~Dec 21): `setTime(new Date(currentYear, 11, 21, 12, 0, 0))`
>    - Use the year from the current `currentTime` (so if the user has navigated to 2030, solstice buttons jump within 2030)
>    - Jumping to a preset should pause playback and set mode to real-time (paused)
>    - Note: these are approximate dates. Exact dates vary by year. Approximate is fine for educational purposes.
>
> 4. **Date/time picker (`src/lib/components/DateTimePicker.svelte`):**
>
>    A simple date and time input:
>    - Use native HTML `<input type="date">` and `<input type="time">` for simplicity
>    - Bind to `currentTime` in the store
>    - When the user changes the date/time, pause playback and update the simulation
>    - Show the current simulation time prominently (the existing TimeDisplay from Phase 2)
>    - Enforce the ±200 year bounds via min/max attributes on the date input
>
> 5. **Update the time display:**
>    - The existing TimeDisplay should now show the *simulation* time, not the system clock
>    - Add a small indicator when time is NOT real-time (e.g., "Simulated" label or different text color)
>    - Show playback mode and speed when active (e.g., "▶ 10x" or "⏩ 1 day/s")
>
> 6. **Layout integration:**
>    - The control bar goes between the projection and the status bar, or below the projection
>    - Presets can be part of the control bar or a separate row
>    - Date/time picker can be inline with the time display
>    - Keep the layout clean and not cluttered
>
> ### Important constraints:
> - Do NOT implement geographic labels or overlays — that is Phase 5
> - Do NOT implement location input or sun data panel — that is Phase 6
> - The time controls should work with both the globe AND projection (both read from the same store)
> - Keyboard shortcuts are nice-to-have but not required in this phase
>
> ### Testing time controls:
> - Set to June solstice → Arctic should be fully lit, Antarctic fully dark
> - Set to December solstice → opposite of above
> - Set to equinox → terminator should run pole-to-pole
> - Smooth mode at 100x → terminator should visibly sweep across the globe
> - Snap mode at 1 day → terminator should shift noticeably with each tick (especially near solstices, the terminator latitude changes slowly; near equinoxes, it changes faster)

## Files to Create/Modify

```
src/lib/stores/
  time.ts                  (modify: add playback modes, speed, snap logic)
src/lib/components/
  Controls.svelte          (new: transport controls bar)
  Presets.svelte            (new: solstice/equinox quick-jump buttons)
  DateTimePicker.svelte     (new: date and time input)
  TimeDisplay.svelte        (modify: show simulation time, mode indicator)
src/App.svelte             (modify: integrate new control components)
src/app.css                (modify: styles for controls)
```

## Acceptance Criteria

- [ ] Play/Pause button works — time advances or freezes
- [ ] Smooth mode works with visible speed multipliers (at least 1x, 10x, 100x tested)
- [ ] Reverse smooth mode works (time runs backward)
- [ ] Snap mode advances time in discrete day jumps (~1 per second)
- [ ] Snap mode works in reverse
- [ ] Speed/interval selectors visually indicate the current setting
- [ ] "Reset to real-time" button syncs back to the system clock
- [ ] Solstice and equinox preset buttons jump to the correct dates
- [ ] Date/time picker allows arbitrary date selection
- [ ] Time bounds (±200 years) are enforced
- [ ] Both globe and projection update correctly with all time modes
- [ ] Time display shows simulation time with mode indicator
- [ ] Controls have a clean, uncluttered layout
- [ ] `npm run build` passes
- [ ] `npm run check` passes

## Phase Completion Checklist

- [ ] All acceptance criteria met
- [ ] Verified at solstice and equinox dates (both preset buttons and manual entry)
- [ ] Verified smooth and snap modes in both directions
- [ ] `npm run build` passes
- [ ] `npm run check` passes
- [ ] Tested in browser
- [ ] Phase status updated in `docs/phases/README.md`
- [ ] Current phase updated in `CLAUDE.md`
- [ ] Changes committed: `phase 4 complete: time controls with smooth and snap modes`

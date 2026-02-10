<script lang="ts">
  import { currentTime, setTime } from '../stores/time.js';

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  let viewYear: number = $state(new Date().getUTCFullYear());
  let viewMonth: number = $state(new Date().getUTCMonth()); // 0-indexed
  let selectedYear: number = $state(new Date().getUTCFullYear());
  let selectedMonth: number = $state(new Date().getUTCMonth());
  let selectedDay: number = $state(new Date().getUTCDate());

  currentTime.subscribe((t) => {
    selectedYear = t.getUTCFullYear();
    selectedMonth = t.getUTCMonth();
    selectedDay = t.getUTCDate();
    viewYear = selectedYear;
    viewMonth = selectedMonth;
  });

  function daysInMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  }

  function firstDayOfWeek(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 1)).getUTCDay();
  }

  function calendarGrid(): (number | null)[] {
    const total = daysInMonth(viewYear, viewMonth);
    const start = firstDayOfWeek(viewYear, viewMonth);
    const grid: (number | null)[] = [];
    for (let i = 0; i < start; i++) grid.push(null);
    for (let d = 1; d <= total; d++) grid.push(d);
    return grid;
  }

  function isSelected(day: number): boolean {
    return day === selectedDay && viewMonth === selectedMonth && viewYear === selectedYear;
  }

  function isToday(day: number): boolean {
    const now = new Date();
    return day === now.getUTCDate() && viewMonth === now.getUTCMonth() && viewYear === now.getUTCFullYear();
  }

  function selectDay(day: number) {
    // Keep the current time-of-day, change only the date
    const cur = new Date(selectedYear, selectedMonth, selectedDay);
    const hours = cur.getUTCHours?.() ?? 12;
    const mins = cur.getUTCMinutes?.() ?? 0;
    setTime(new Date(Date.UTC(viewYear, viewMonth, day, hours, mins, 0)));
  }

  function prevMonth() {
    if (viewMonth === 0) {
      viewMonth = 11;
      viewYear--;
    } else {
      viewMonth--;
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      viewMonth = 0;
      viewYear++;
    } else {
      viewMonth++;
    }
  }

  function prevYear() {
    viewYear--;
  }

  function nextYear() {
    viewYear++;
  }
</script>

<div class="calendar">
  <div class="cal-nav">
    <button class="cal-btn" onclick={prevYear} aria-label="Previous year" title="Previous year">&lt;&lt;</button>
    <button class="cal-btn" onclick={prevMonth} aria-label="Previous month" title="Previous month">&lt;</button>
    <span class="cal-title">{MONTH_NAMES[viewMonth]} {viewYear}</span>
    <button class="cal-btn" onclick={nextMonth} aria-label="Next month" title="Next month">&gt;</button>
    <button class="cal-btn" onclick={nextYear} aria-label="Next year" title="Next year">&gt;&gt;</button>
  </div>
  <div class="cal-grid">
    {#each DAY_HEADERS as h (h)}
      <span class="cal-header">{h}</span>
    {/each}
    {#each calendarGrid() as day, i (day ?? `e${i}`)}
      {#if day === null}
        <span class="cal-empty"></span>
      {:else}
        <button
          class="cal-day"
          class:selected={isSelected(day)}
          class:today={isToday(day)}
          onclick={() => selectDay(day)}
        >
          {day}
        </button>
      {/if}
    {/each}
  </div>
</div>

<style>
  .calendar {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 0.5rem;
    width: 100%;
    flex-shrink: 0;
    user-select: none;
  }

  .cal-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.4rem;
  }

  .cal-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
    text-align: center;
    flex: 1;
  }

  .cal-btn {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    padding: 0.25rem 0.4rem;
    min-width: 2.2rem;
    min-height: 2.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  .cal-btn:hover {
    color: var(--color-text);
    border-color: var(--color-text-muted);
  }

  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
  }

  .cal-header {
    font-size: 0.65rem;
    color: var(--color-text-muted);
    text-align: center;
    padding: 0.15rem 0;
  }

  .cal-empty {
    min-height: 1px;
  }

  .cal-day {
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    padding: 0.3rem 0;
    min-height: 2rem;
    text-align: center;
    cursor: pointer;
    font-family: inherit;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  .cal-day:hover {
    color: var(--color-text);
    border-color: var(--color-border);
  }

  .cal-day.today {
    border-color: var(--color-text-muted);
    color: var(--color-text);
  }

  .cal-day.selected {
    background: var(--color-accent);
    color: var(--color-bg);
    font-weight: 700;
    border-color: var(--color-accent);
  }
</style>

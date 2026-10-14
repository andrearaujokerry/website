const monthYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "Jan 2025" */
export function formatMonth(date: Date) {
  return monthYear.format(date);
}

/** "Jan 2025 — Aug 2025", or "Jul 2024 — Present" for something ongoing. */
export function formatRange(start: Date, end: Date | 'present') {
  return `${formatMonth(start)} — ${end === 'present' ? 'Present' : formatMonth(end)}`;
}

import { describe, expect, test } from 'vitest';
import { formatMonth, formatRange } from '../../src/lib/dates';

/** How the content schema stores a month: midnight UTC on the 1st. */
const month = (value: string) => new Date(`${value}-01T00:00:00Z`);

describe('formatMonth', () => {
  test('shows the short month and the year', () => {
    expect(formatMonth(month('2025-01'))).toBe('Jan 2025');
    expect(formatMonth(month('2026-09'))).toBe('Sep 2026');
  });

  test('reads the date in UTC, so the 1st never slips back a month', () => {
    // These tests run in Los Angeles time, where this instant is still Dec 31, 2024.
    expect(formatMonth(month('2025-01'))).toBe('Jan 2025');
  });
});

describe('formatRange', () => {
  test('joins the start and end months with an em dash', () => {
    expect(formatRange(month('2025-01'), month('2025-08'))).toBe('Jan 2025 — Aug 2025');
  });

  test('ends with "Present" for something ongoing', () => {
    expect(formatRange(month('2024-07'), 'present')).toBe('Jul 2024 — Present');
  });
});

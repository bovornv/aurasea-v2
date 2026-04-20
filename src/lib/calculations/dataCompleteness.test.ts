import { describe, it, expect } from 'vitest'
import {
  computeDataCompleteness,
  isFnbRowComplete,
  type FnbCompletenessRow,
} from './dataCompleteness'

const today = '2026-04-20'

function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + delta)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function completeRow(date: string): FnbCompletenessRow {
  return { metric_date: date, revenue: 8000, total_customers: 40, additional_cost_today: 3000 }
}

describe('computeDataCompleteness', () => {
  it('returns 0/30 when there are no entries at all', () => {
    const result = computeDataCompleteness([], isFnbRowComplete, today)
    expect(result.daysPresent).toBe(0)
    expect(result.windowSize).toBe(30)
    expect(result.percentage).toBe(0)
    expect(result.level).toBe('red')
    expect(result.consecutiveCompleteDays).toBe(0)
    expect(result.days).toHaveLength(30)
    expect(result.days[29].date).toBe(today)
  })

  it('counts partial coverage and picks the right threshold color', () => {
    // 7 of the last 30 days complete → 23.3% → 23% red.
    const rows: FnbCompletenessRow[] = Array.from({ length: 7 }, (_, i) =>
      completeRow(addDays(today, -i)),
    )
    const result = computeDataCompleteness(rows, isFnbRowComplete, today)
    expect(result.daysPresent).toBe(7)
    expect(result.percentage).toBe(23)
    expect(result.level).toBe('red')
  })

  it('amber at 50-79%', () => {
    const rows: FnbCompletenessRow[] = Array.from({ length: 18 }, (_, i) =>
      completeRow(addDays(today, -i)),
    )
    // 18/30 = 60%
    const result = computeDataCompleteness(rows, isFnbRowComplete, today)
    expect(result.percentage).toBe(60)
    expect(result.level).toBe('amber')
  })

  it('green at 80%+', () => {
    const rows: FnbCompletenessRow[] = Array.from({ length: 24 }, (_, i) =>
      completeRow(addDays(today, -i)),
    )
    const result = computeDataCompleteness(rows, isFnbRowComplete, today)
    expect(result.percentage).toBe(80)
    expect(result.level).toBe('green')
  })

  it('treats rows missing any required field as NOT complete', () => {
    const rows: FnbCompletenessRow[] = [
      { metric_date: addDays(today, -1), revenue: 8000, total_customers: 40, additional_cost_today: null },
      { metric_date: addDays(today, -2), revenue: 8000, total_customers: null, additional_cost_today: 3000 },
      { metric_date: addDays(today, -3), revenue: 0, total_customers: 40, additional_cost_today: 3000 },
      completeRow(addDays(today, -4)),
    ]
    const result = computeDataCompleteness(rows, isFnbRowComplete, today)
    expect(result.daysPresent).toBe(1)
  })

  it('consecutiveCompleteDays = 0 when not yet at 30/30', () => {
    const rows: FnbCompletenessRow[] = Array.from({ length: 29 }, (_, i) =>
      completeRow(addDays(today, -i)),
    )
    const result = computeDataCompleteness(rows, isFnbRowComplete, today)
    expect(result.daysPresent).toBe(29)
    expect(result.consecutiveCompleteDays).toBe(0)
  })

  it('consecutiveCompleteDays = 1 on the first day of 30/30', () => {
    // Exactly 30 consecutive complete days ending today — today's window
    // is 30/30, but yesterday's window needed 30 complete days ending on
    // yesterday which requires a 31st complete day 30 days before today.
    // Without that, yesterday's window is only 29/30.
    const rows: FnbCompletenessRow[] = Array.from({ length: 30 }, (_, i) =>
      completeRow(addDays(today, -i)),
    )
    const result = computeDataCompleteness(rows, isFnbRowComplete, today)
    expect(result.daysPresent).toBe(30)
    expect(result.percentage).toBe(100)
    expect(result.level).toBe('green')
    expect(result.consecutiveCompleteDays).toBe(1)
  })

  it('consecutiveCompleteDays = 7 after a 30/30 window has held for 7 days', () => {
    // 36 consecutive complete days. For each of today..today-6, the 30
    // days ending on that date are all complete, so streak = 7.
    const rows: FnbCompletenessRow[] = Array.from({ length: 36 }, (_, i) =>
      completeRow(addDays(today, -i)),
    )
    const result = computeDataCompleteness(rows, isFnbRowComplete, today)
    expect(result.daysPresent).toBe(30)
    expect(result.consecutiveCompleteDays).toBe(7)
  })

  it('streak resets the moment any day in the window is missed', () => {
    // 36 days of data, but day -3 is missing. Today's window drops to
    // 29/30 → streak must be 0.
    const rows: FnbCompletenessRow[] = Array.from({ length: 36 }, (_, i) =>
      i === 3 ? null : completeRow(addDays(today, -i)),
    ).filter((r): r is FnbCompletenessRow => r !== null)
    const result = computeDataCompleteness(rows, isFnbRowComplete, today)
    expect(result.daysPresent).toBe(29)
    expect(result.consecutiveCompleteDays).toBe(0)
    expect(result.level).toBe('green') // still 97% — just not perfect
  })

  it('streak is 0 when today itself is incomplete, even if the rest is perfect', () => {
    // 30-day perfect run ending yesterday, today is missing.
    const rows: FnbCompletenessRow[] = Array.from({ length: 30 }, (_, i) =>
      completeRow(addDays(today, -1 - i)),
    )
    const result = computeDataCompleteness(rows, isFnbRowComplete, today)
    expect(result.daysPresent).toBe(29)
    expect(result.consecutiveCompleteDays).toBe(0)
  })

  it('normalises UTC-timestamp metric_date inputs', () => {
    // 2026-04-19 17:00 UTC = 2026-04-20 midnight Bangkok
    const rows: FnbCompletenessRow[] = [
      {
        metric_date: '2026-04-19T17:00:00+00:00',
        revenue: 8000,
        total_customers: 40,
        additional_cost_today: 3000,
      },
    ]
    const result = computeDataCompleteness(rows, isFnbRowComplete, today)
    expect(result.daysPresent).toBe(1)
    expect(result.completeDates).toContain(today)
  })
})

/**
 * Data-completeness selector — how much of the last 30 days has a complete
 * entry for this venue. Single source of truth shared by the page-title
 * pill, the detail popover, and the Cost tab's inline section.
 *
 * Definition of "complete" is caller-supplied (see isComplete) so we can
 * cover both F&B (sales + covers + variable cost) and hotel (sales +
 * rooms_sold + variable cost) without hardcoding fields here.
 */

import { toBangkokDateStr } from '@/lib/businessDate'

export type CompletenessLevel = 'green' | 'amber' | 'red'

export interface CompletenessRow {
  metric_date: string
}

export interface DataCompleteness {
  /** Days with a complete entry in the 30-day window ending at `today`. */
  daysPresent: number
  windowSize: 30
  /** Rounded to the nearest integer. Always daysPresent/30 × 100 — no fudge. */
  percentage: number
  level: CompletenessLevel
  /**
   * Number of consecutive most-recent days that are themselves complete AND
   * for which the 30-day window ending on that day was also 30/30. Stays 0
   * until the venue has sustained a perfect window. Used by the pill logic
   * today for tests + future telemetry.
   */
  consecutiveCompleteDays: number
  /** Sorted ascending YYYY-MM-DD Bangkok-local dates of complete entries. */
  completeDates: string[]
  /**
   * The 30-day window (oldest → today) with a flag per day. Drives the
   * strip visualisation in the popover without each caller redoing the
   * window arithmetic.
   */
  days: { date: string; complete: boolean }[]
}

function levelFor(pct: number): CompletenessLevel {
  if (pct >= 80) return 'green'
  if (pct >= 50) return 'amber'
  return 'red'
}

function addDays(dateStr: string, delta: number): string {
  // Treat YYYY-MM-DD as UTC midnight so arithmetic never crosses DST.
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + delta)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Compute data completeness for the 30-day window ending at `today`.
 *
 * @param rows  Every available entry row — ideally spanning at least the last
 *              37 days so `consecutiveCompleteDays` can look back to the
 *              oldest window it may need to check.
 * @param isComplete  Business-type-specific test; see F&B/Hotel variants at
 *                    the bottom of this file.
 * @param today  YYYY-MM-DD Bangkok-local "today" marker. Passed in rather
 *               than read from the clock so the selector is pure/testable.
 */
export function computeDataCompleteness<T extends CompletenessRow>(
  rows: T[],
  isComplete: (r: T) => boolean,
  today: string,
): DataCompleteness {
  // Index rows by their Bangkok-local date for O(1) lookup. Multiple rows
  // on the same date (shouldn't happen after migration 018) collapse to
  // "complete if ANY is complete".
  const byDate = new Map<string, boolean>()
  for (const r of rows) {
    const d = toBangkokDateStr(r.metric_date)
    if (!d) continue
    const prev = byDate.get(d) || false
    byDate.set(d, prev || isComplete(r))
  }

  // Build the 30-day window oldest → today for the strip + counting.
  const days: { date: string; complete: boolean }[] = []
  for (let i = 29; i >= 0; i--) {
    const date = addDays(today, -i)
    days.push({ date, complete: byDate.get(date) === true })
  }

  const daysPresent = days.reduce((n, d) => (d.complete ? n + 1 : n), 0)
  const percentage = Math.round((daysPresent / 30) * 100)

  // consecutiveCompleteDays: walk backwards from today counting days that
  // are (a) themselves complete AND (b) had a 30/30 window ending on that
  // day. Stops at the first day failing either condition. The 30/30 check
  // slides the window one day at a time, so we need at most 37 days of
  // input data (30 window + 7 look-back).
  let consecutiveCompleteDays = 0
  for (let i = 0; i < 7; i++) {
    const refDate = addDays(today, -i)
    if (byDate.get(refDate) !== true) break
    let windowCount = 0
    for (let j = 0; j < 30; j++) {
      if (byDate.get(addDays(refDate, -j)) === true) windowCount++
    }
    if (windowCount < 30) break
    consecutiveCompleteDays++
  }

  return {
    daysPresent,
    windowSize: 30,
    percentage,
    level: levelFor(percentage),
    consecutiveCompleteDays,
    completeDates: days.filter((d) => d.complete).map((d) => d.date),
    days,
  }
}

// --- Business-type-specific "is this row complete?" predicates ---------

export interface FnbCompletenessRow extends CompletenessRow {
  revenue: number | null
  total_customers: number | null
  additional_cost_today: number | null
}

export function isFnbRowComplete(r: FnbCompletenessRow): boolean {
  return (r.revenue ?? 0) > 0 && (r.total_customers ?? 0) > 0 && (r.additional_cost_today ?? 0) > 0
}

export interface HotelCompletenessRow extends CompletenessRow {
  revenue: number | null
  rooms_sold: number | null
  additional_cost_today: number | null
}

export function isHotelRowComplete(r: HotelCompletenessRow): boolean {
  return (r.revenue ?? 0) > 0 && (r.rooms_sold ?? 0) > 0 && (r.additional_cost_today ?? 0) > 0
}

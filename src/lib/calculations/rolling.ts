/**
 * Calculate a rolling 7-day average, filling missing days with historical ratio.
 * @param entries - array of {date, value} sorted ascending
 * @param referenceDate - ISO date string (YYYY-MM-DD) to centre the window on
 * @returns 7-day average value
 */
export function rolling7DayAvg(
  entries: { date: string; value: number | null }[],
  referenceDate: string
): number {
  const refDate = new Date(referenceDate + 'T00:00:00')
  const windowStart = new Date(refDate)
  windowStart.setDate(windowStart.getDate() - 6) // 7 days including ref

  const startStr = windowStart.toISOString().split('T')[0]

  // Filter entries in the 7-day window
  const windowEntries = entries.filter(
    (e) => e.date >= startStr && e.date <= referenceDate
  )

  // Calculate historical average from all non-null entries (for fallback)
  const allValid = entries.filter((e) => e.value != null && e.value > 0)
  const historicalAvg =
    allValid.length > 0
      ? allValid.reduce((sum, e) => sum + (e.value || 0), 0) / allValid.length
      : 0

  // Build 7-day values, filling missing days with historical avg
  const values: number[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(windowStart)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const entry = windowEntries.find((e) => e.date === dateStr)
    if (entry && entry.value != null && entry.value > 0) {
      values.push(entry.value)
    } else {
      values.push(historicalAvg)
    }
  }

  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

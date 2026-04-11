const BANGKOK_TZ = 'Asia/Bangkok'

/**
 * Get current time in Bangkok timezone.
 * Uses Intl API — no external dependency needed.
 */
function nowBangkok(): Date {
  const nowStr = new Date().toLocaleString('en-US', { timeZone: BANGKOK_TZ })
  return new Date(nowStr)
}

/**
 * Format a Date as YYYY-MM-DD
 */
function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Given the current UTC time and a branch's cutoff time,
 * returns the correct business date as YYYY-MM-DD.
 *
 * If current Bangkok time >= cutoffTime → business date = today (Bangkok)
 * If current Bangkok time < cutoffTime → business date = yesterday (Bangkok)
 *
 * Examples:
 *   Crystal Café (cutoff 03:00), entry at 17:30 → today ✓
 *   Crystal Resort (cutoff 12:00), entry at 05:00 → yesterday ✓
 *   Crystal Resort (cutoff 12:00), entry at 14:00 → today ✓
 */
export function getBusinessDate(cutoffTime: string = '03:00:00'): string {
  const now = nowBangkok()

  const [cutoffHour, cutoffMin] = cutoffTime.split(':').map(Number)
  const cutoffMinutes = cutoffHour * 60 + (cutoffMin || 0)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  if (currentMinutes >= cutoffMinutes) {
    return toDateStr(now)
  } else {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return toDateStr(yesterday)
  }
}

/**
 * Get today's date in Bangkok timezone as YYYY-MM-DD
 */
export function getTodayBangkok(): string {
  return toDateStr(nowBangkok())
}

/**
 * Get the minimum allowed backdate
 */
export function getMinAllowedDate(maxBackDays: number): string {
  const now = nowBangkok()
  now.setDate(now.getDate() - maxBackDays)
  return toDateStr(now)
}

/**
 * Format a YYYY-MM-DD business date for display
 * Returns label (วันนี้/เมื่อวาน) and formatted date string
 */
export function formatBusinessDateDisplay(
  businessDate: string,
  lang: 'th' | 'en' = 'th'
): { label: string; dateStr: string; daysBack: number } {
  const today = getTodayBangkok()
  const now = nowBangkok()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = toDateStr(yesterday)

  const dateObj = new Date(businessDate + 'T00:00:00')
  const dateStr = dateObj.toLocaleDateString(
    lang === 'th' ? 'th-TH' : 'en-GB',
    { day: 'numeric', month: 'short', year: 'numeric' }
  )

  // Calculate days back
  const todayDate = new Date(today + 'T00:00:00')
  const bizDate = new Date(businessDate + 'T00:00:00')
  const diffMs = todayDate.getTime() - bizDate.getTime()
  const daysBack = Math.round(diffMs / 86400000)

  if (businessDate === today) {
    return { label: lang === 'th' ? 'วันนี้' : 'Today', dateStr, daysBack: 0 }
  } else if (businessDate === yesterdayStr) {
    return { label: lang === 'th' ? 'เมื่อวาน' : 'Yesterday', dateStr, daysBack: 1 }
  } else {
    return { label: '', dateStr, daysBack }
  }
}

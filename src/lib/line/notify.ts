/**
 * LINE Messaging API integration (replaces deprecated LINE Notify)
 *
 * LINE Notify was discontinued on March 31, 2025.
 * This module is stubbed — will be implemented when a LINE Official Account
 * is created and the Messaging API is configured.
 *
 * To activate:
 * 1. Create a LINE Official Account at https://www.linebiz.com/
 * 2. Enable the Messaging API in LINE Developers console
 * 3. Get Channel Access Token and Channel Secret
 * 4. Add to .env.local:
 *    LINE_CHANNEL_ACCESS_TOKEN=xxx
 *    LINE_CHANNEL_SECRET=xxx
 * 5. Replace the stubs below with real Messaging API calls
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getLineAuthUrl(_state: string): string {
  // Stub — LINE Official Account uses friend-add flow, not OAuth
  return '#line-not-configured'
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function exchangeLineCode(_code: string): Promise<string> {
  throw new Error('LINE integration not yet configured — create a LINE Official Account first')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function sendLineNotify(_token: string, _message: string): Promise<boolean> {
  // Stub — always returns false (not configured)
  console.log('[LINE] Message not sent — LINE Messaging API not configured')
  return false
}

export function buildMorningFlashLine(params: {
  branchName: string
  branchType: 'accommodation' | 'fnb'
  date: string
  adr?: number
  adrTarget?: number
  occupancy?: number
  roomsAvailable?: number
  revenue?: number
  margin?: number
  covers?: number
  sales?: number
  recommendation: string
}): string {
  const { branchName, branchType, date } = params
  if (branchType === 'accommodation') {
    const gap = params.adr && params.adrTarget ? params.adr - params.adrTarget : 0
    const sign = gap >= 0 ? '+' : ''
    return `🏨 ${branchName} — ${date}\nADR ฿${Math.round(params.adr || 0)} (${sign}฿${Math.round(Math.abs(gap))})\nOcc ${Math.round(params.occupancy || 0)}% · ${params.roomsAvailable || 0} ห้องว่าง\nรายได้ ฿${(params.revenue || 0).toLocaleString()}\n\n💡 ${params.recommendation}`
  }
  return `☕ ${branchName} — ${date}\nMargin ${(params.margin || 0).toFixed(1)}%\nCovers ${params.covers || 0} · ฿${(params.sales || 0).toLocaleString()}\n\n💡 ${params.recommendation}`
}

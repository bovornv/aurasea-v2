import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { exchangeLineCode } from '@/lib/line/notify'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const code = formData.get('code') as string
  const state = formData.get('state') as string

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings/notifications?line=error', req.url))
  }

  try {
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString())
    const token = await exchangeLineCode(code)

    const supabase = createServiceClient()
    // Update notification_settings with Line token
    await supabase
      .from('notification_settings')
      .update({
        line_notify_token: token,
        line_notify_connected_at: new Date().toISOString(),
        line_notify_enabled: true,
      })
      .eq('user_id', userId)

    return NextResponse.redirect(new URL('/settings/notifications?line=connected', req.url))
  } catch {
    return NextResponse.redirect(new URL('/settings/notifications?line=error', req.url))
  }
}

// Also handle GET in case Line sends code via query params
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings/notifications?line=error', req.url))
  }

  try {
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString())
    const token = await exchangeLineCode(code)

    const supabase = createServiceClient()
    await supabase
      .from('notification_settings')
      .update({
        line_notify_token: token,
        line_notify_connected_at: new Date().toISOString(),
        line_notify_enabled: true,
      })
      .eq('user_id', userId)

    return NextResponse.redirect(new URL('/settings/notifications?line=connected', req.url))
  } catch {
    return NextResponse.redirect(new URL('/settings/notifications?line=error', req.url))
  }
}

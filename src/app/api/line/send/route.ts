import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendLineNotify } from '@/lib/line/notify'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message } = await req.json()

  // Get user's Line token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (supabase as any)
    .from('notification_settings')
    .select('line_notify_token')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!settings?.line_notify_token) {
    return NextResponse.json({ error: 'Line not connected' }, { status: 400 })
  }

  const ok = await sendLineNotify(settings.line_notify_token, message || 'ทดสอบจาก Aurasea ✓')
  return NextResponse.json({ success: ok })
}

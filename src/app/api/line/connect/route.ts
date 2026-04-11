import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLineAuthUrl } from '@/lib/line/notify'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SUPABASE_URL))

  const state = Buffer.from(JSON.stringify({ userId: user.id, ts: Date.now() })).toString('base64')
  const lineUrl = getLineAuthUrl(state)
  return NextResponse.redirect(lineUrl)
}

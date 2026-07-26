import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { animal_id, banner_id, session_id, page } = await req.json()
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const ua = req.headers.get('user-agent') || ''
  const referrer = req.headers.get('referer') || ''

  if (animal_id) {
    await supabase.from('nm_analytics').insert({
      animal_id,
      session_id,
      ip_address: ip,
      user_agent: ua,
      referrer,
    })
  }

  if (banner_id) {
    await supabase.from('nm_banner_cliques').insert({
      banner_id,
      session_id,
    })
  }

  if (page) {
    await supabase.from('nm_page_views').insert({
      page,
      session_id,
      ip_address: ip,
      user_agent: ua,
    })
  }

  return NextResponse.json({ ok: true })
}

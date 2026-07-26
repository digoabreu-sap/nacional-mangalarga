import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function verifyToken(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const payload = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString())
    if (payload.exp < Date.now()) return null
    return payload
  } catch { return null }
}

export async function GET(req: NextRequest) {
  if (!verifyToken(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type')

  if (type === 'top_animals') {
    const { data } = await supabase.rpc('nm_top_animals', { limit_count: 20 })
    return NextResponse.json(data || [])
  }

  if (type === 'daily_views') {
    const { data } = await supabase.rpc('nm_daily_views', { days: 7 })
    return NextResponse.json(data || [])
  }

  if (type === 'total_views') {
    const { data } = await supabase.rpc('nm_total_views_7d')
    return NextResponse.json({ total: data || 0 })
  }

  if (type === 'total_clicks') {
    const { data } = await supabase.rpc('nm_total_clicks')
    return NextResponse.json({ total: data || 0 })
  }

  if (type === 'banner_clicks') {
    const { data } = await supabase.rpc('nm_banner_cliques_stats')
    return NextResponse.json(data || [])
  }

  return NextResponse.json({ error: 'Tipo invalido' }, { status: 400 })
}

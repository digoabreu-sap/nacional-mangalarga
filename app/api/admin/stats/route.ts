import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type')
  const payload = decodeAdminToken(req)
  // banner_clicks pertence a aba Banners; o resto (top_animals/daily_views/
  // total_views/total_clicks) pertence a aba Analytics.
  const abaNecessaria = type === 'banner_clicks' ? 'banners' : 'analytics'
  if (!temPermissao(payload, abaNecessaria)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

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

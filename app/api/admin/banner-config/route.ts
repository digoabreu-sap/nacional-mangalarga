import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'banners')
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { data } = await supabase.rpc('nm_get_banner_config')
  const config = Array.isArray(data) ? data[0] : data
  return NextResponse.json({ espacamento_px: config?.espacamento_px ?? 12 })
}

export async function PUT(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { espacamento_px } = await req.json()

  const { error } = await supabase.rpc('nm_admin_set_banner_config', {
    p_espacamento_px: espacamento_px ?? null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

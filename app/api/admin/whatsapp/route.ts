import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'whatsapp')
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const [{ data: configData }, { data: totalData }, { data: topData }] = await Promise.all([
    supabase.rpc('nm_get_whatsapp_config'),
    supabase.rpc('nm_whatsapp_cliques_total'),
    supabase.rpc('nm_whatsapp_cliques_top', { limit_count: 20 }),
  ])
  const config = Array.isArray(configData) ? configData[0] : configData

  return NextResponse.json({
    numero: config?.numero || '',
    mensagem_template: config?.mensagem_template || '',
    total_cliques: totalData || 0,
    top_animais: topData || [],
  })
}

export async function PUT(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { numero, mensagem_template } = await req.json()

  const { error } = await supabase.rpc('nm_admin_set_whatsapp_config', {
    p_numero: numero || null,
    p_mensagem_template: mensagem_template || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

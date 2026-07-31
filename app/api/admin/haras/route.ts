import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'haras')
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { data, error } = await supabase.rpc('nm_admin_list_haras')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ haras: data || [] })
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const body = await req.json()
  const nome = (body.nome || '').trim()
  if (!nome) return NextResponse.json({ error: 'Nome e obrigatorio' }, { status: 400 })

  const { data, error } = await supabase.rpc('nm_admin_upsert_haras', {
    p_id: body.id || null,
    p_nome: nome,
    p_cidade: body.cidade || null,
    p_uf: body.uf || null,
    p_expositor: body.expositor || null,
    p_site_url: body.site_url || null,
    p_instagram_url: body.instagram_url || null,
    p_telefone: body.telefone || null,
  })
  if (error) return NextResponse.json({ error: error.message.includes('duplicate') ? 'Ja existe um haras com esse nome' : error.message }, { status: 400 })
  return NextResponse.json({ haras: data })
}

export async function DELETE(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id e obrigatorio' }, { status: 400 })
  const { error } = await supabase.rpc('nm_admin_delete_haras', { p_id: id })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

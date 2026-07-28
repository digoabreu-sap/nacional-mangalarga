import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'banners')
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { data } = await supabase.rpc('nm_admin_list_banners')
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const body = await req.json()
  const { data, error } = await supabase.rpc('nm_admin_create_banner', {
    p_posicao: body.posicao,
    p_titulo: body.titulo || null,
    p_imagem_url: body.imagem_url || null,
    p_link_url: body.link_url || null,
    p_html_content: body.html_content || null,
    p_ativo: body.ativo ?? true,
    p_ordem: body.ordem ?? 0,
    p_tamanho_pct: body.tamanho_pct ?? 100,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const body = await req.json()
  const { data, error } = await supabase.rpc('nm_admin_update_banner', {
    p_id: body.id,
    p_posicao: body.posicao || null,
    p_titulo: body.titulo || null,
    p_imagem_url: body.imagem_url || null,
    p_link_url: body.link_url || null,
    p_html_content: body.html_content || null,
    p_ativo: body.ativo ?? null,
    p_ordem: body.ordem ?? null,
    p_tamanho_pct: body.tamanho_pct ?? null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { id } = await req.json()
  await supabase.rpc('nm_admin_delete_banner', { p_id: id })
  return NextResponse.json({ ok: true })
}

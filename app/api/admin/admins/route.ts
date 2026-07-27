import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken } from '@/lib/adminAuth'

// Gerenciar admins/permissoes e sempre exclusivo de quem e is_master (nao
// entra no esquema de permissoes por aba, pra um admin restrito nao poder
// se autopromover).
function verificarMaster(req: NextRequest) {
  const payload = decodeAdminToken(req)
  return payload?.is_master ? payload : null
}

export async function GET(req: NextRequest) {
  if (!verificarMaster(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { data } = await supabase.rpc('nm_admin_list_admins')
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  if (!verificarMaster(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { email, password, nome, is_master, permissoes } = await req.json()
  if (!email || !password || !nome) return NextResponse.json({ error: 'Todos os campos sao obrigatorios' }, { status: 400 })

  const { error } = await supabase.rpc('nm_add_admin', {
    p_email: email, p_password: password, p_nome: nome,
    p_is_master: !!is_master, p_permissoes: permissoes || [],
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest) {
  if (!verificarMaster(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { id, is_master, permissoes } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 })

  const { error } = await supabase.rpc('nm_admin_set_permissoes', {
    p_id: id, p_is_master: !!is_master, p_permissoes: permissoes || [],
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!verificarMaster(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { id } = await req.json()
  await supabase.rpc('nm_admin_delete_admin', { p_id: id })
  return NextResponse.json({ ok: true })
}

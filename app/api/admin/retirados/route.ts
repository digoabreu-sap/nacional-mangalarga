import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'categoria')
}

// A lista de animais (com o flag "retirado") ja vem do GET de
// /api/admin/finalistas-marcha - aqui so grava a selecao, sem limite de
// quantidade (diferente dos classificados, que sao no maximo 7).
export async function PUT(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { categoria, tipo_marcha, animal_ids } = await req.json()
  if (!categoria || !tipo_marcha || !Array.isArray(animal_ids)) {
    return NextResponse.json({ error: 'categoria, tipo_marcha e animal_ids sao obrigatorios' }, { status: 400 })
  }

  const { error } = await supabase.rpc('nm_admin_set_retirados', {
    p_categoria: categoria,
    p_tipo_marcha: tipo_marcha,
    p_animal_ids: animal_ids,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

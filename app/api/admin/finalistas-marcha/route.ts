import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'categoria')
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const categoria = req.nextUrl.searchParams.get('categoria')
  const tipoMarcha = req.nextUrl.searchParams.get('tipo_marcha')
  if (!categoria || !tipoMarcha) return NextResponse.json({ error: 'categoria e tipo_marcha sao obrigatorios' }, { status: 400 })

  const { data, error } = await supabase
    .from('nm_animais')
    .select('id, nome, num_catalogo, haras, finalista_marcha')
    .eq('categoria', categoria)
    .eq('tipo_marcha', tipoMarcha)
    .order('num_catalogo_int', { ascending: true, nullsFirst: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ animais: data || [] })
}

export async function PUT(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { categoria, tipo_marcha, animal_ids } = await req.json()
  if (!categoria || !tipo_marcha || !Array.isArray(animal_ids)) {
    return NextResponse.json({ error: 'categoria, tipo_marcha e animal_ids sao obrigatorios' }, { status: 400 })
  }
  if (animal_ids.length > 7) return NextResponse.json({ error: 'Maximo de 7 classificados' }, { status: 400 })

  const { error } = await supabase.rpc('nm_admin_set_finalistas_marcha', {
    p_categoria: categoria,
    p_tipo_marcha: tipo_marcha,
    p_animal_ids: animal_ids,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

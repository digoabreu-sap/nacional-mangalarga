import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'categoria')
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const [{ data: atualData }, { data: categoriasData }] = await Promise.all([
    supabase.rpc('nm_get_categoria_atual'),
    supabase.rpc('nm_distinct_categorias'),
  ])

  // nm_get_categoria_atual so devolve as pistas com categoria definida - uma
  // pista ausente na resposta e uma pista vazia (nunca configurada ou limpa).
  const linhas: { id: number; categoria: string; tipo_marcha: string | null }[] = atualData || []
  const pistas = [1, 2].map(id => {
    const linha = linhas.find(l => l.id === id)
    return { id, categoria: linha?.categoria || null, tipo_marcha: linha?.tipo_marcha || null }
  })
  const categorias = (categoriasData || [])
    .map((d: { categoria: string }) => d.categoria)
    .filter(Boolean)

  return NextResponse.json({ pistas, categorias })
}

export async function PUT(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { id, categoria, tipo_marcha } = await req.json()
  if (id !== 1 && id !== 2) return NextResponse.json({ error: 'id invalido (precisa ser 1 ou 2)' }, { status: 400 })

  const { error } = await supabase.rpc('nm_admin_set_categoria_atual', {
    p_id: id,
    p_categoria: categoria || null,
    p_tipo_marcha: categoria ? (tipo_marcha || null) : null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'resultados')
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const tipo_campeonato = req.nextUrl.searchParams.get('tipo_campeonato')
  const tipo_marcha = req.nextUrl.searchParams.get('tipo_marcha')
  const categoria = req.nextUrl.searchParams.get('categoria')

  if (!tipo_campeonato || !tipo_marcha || !categoria) {
    const { data } = await supabase.from('nm_campeonatos').select('*').order('categoria')
    return NextResponse.json({ campeonatos: data || [] })
  }

  const [animaisRes, resultadosRes] = await Promise.all([
    supabase.from('nm_animais').select('id, num_catalogo, nome')
      .eq('tipo_campeonato', tipo_campeonato).eq('tipo_marcha', tipo_marcha).eq('categoria', categoria)
      .order('num_catalogo'),
    supabase.from('nm_resultados')
      .select('num_catalogo, nome_animal, pontuacao_funcional, pontuacao_morfologia, pontuacao_andamento, colocacao, origem')
      .eq('tipo_campeonato', tipo_campeonato).eq('tipo_marcha', tipo_marcha).eq('categoria', categoria).eq('tipo_prova', 'final'),
  ])

  return NextResponse.json({ animais: animaisRes.data || [], resultados: resultadosRes.data || [] })
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const body = await req.json()
  const { tipo_campeonato, tipo_marcha, categoria, num_catalogo } = body
  if (!tipo_campeonato || !tipo_marcha || !categoria || !num_catalogo) {
    return NextResponse.json({ error: 'Campos obrigatorios faltando' }, { status: 400 })
  }

  // Confere se ja existe resultado oficial (abccmm) pra esse animal - o RPC
  // ja ignora a escrita nesse caso, mas o admin precisa saber que nao rolou.
  const { data: existente } = await supabase
    .from('nm_resultados')
    .select('origem')
    .eq('tipo_campeonato', tipo_campeonato).eq('tipo_marcha', tipo_marcha).eq('categoria', categoria)
    .eq('tipo_prova', 'final').eq('num_catalogo', num_catalogo)
    .limit(1)
  const jaTemOficial = existente?.[0]?.origem === 'abccmm'

  const { error } = await supabase.rpc('nm_admin_upsert_resultado_manual', {
    p_rows: [{
      tipo_campeonato, tipo_marcha, categoria, num_catalogo,
      nome_animal: body.nome_animal || null,
      pontuacao_funcional: body.pontuacao_funcional || null,
      pontuacao_morfologia: body.pontuacao_morfologia || null,
      pontuacao_andamento: body.pontuacao_andamento || null,
      colocacao: body.colocacao || null,
    }],
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, ignorado: jaTemOficial })
}

export async function DELETE(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { tipo_campeonato, tipo_marcha, categoria, num_catalogo } = await req.json()
  const { error } = await supabase.rpc('nm_admin_delete_resultado_manual', {
    p_tipo_campeonato: tipo_campeonato,
    p_tipo_marcha: tipo_marcha,
    p_categoria: categoria,
    p_num_catalogo: num_catalogo,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

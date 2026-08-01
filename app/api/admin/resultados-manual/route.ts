import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'
import { CAMPEOES_ESPECIAIS, tipoDaCategoriaEspecial } from '@/lib/campeoesDosCampeoes'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'resultados')
}

// Os Grandes Campeonatos/Campeao dos Campeoes (Art. 73-76) nao existem em
// nm_campeonatos (tabela vinda do catalogo original, que so conhece as
// categorias de verdade) - sao campeonatos "virtuais" que juntam animais de
// varias categorias, montados na aba Campeoes. Pra dar pra cadastrar
// resultado manual deles tambem, inventa um tipo_campeonato fixo
// ("Grande Campeonato") + usa o proprio nome da categoria virtual como
// categoria, e da IDs negativos (nunca colidem com os ids reais, que sao
// bigserial positivos) pra aparecerem juntos na mesma lista/combobox.
const TIPO_CAMPEONATO_ESPECIAL = 'Grande Campeonato'

function campeonatosEspeciais() {
  const linhas: { id: number; nome: string; tipo_campeonato: string; tipo_marcha: string; categoria: string }[] = []
  for (const esp of CAMPEOES_ESPECIAIS) {
    for (const marcha of ['MB', 'MP'] as const) {
      linhas.push({
        id: -(linhas.length + 1),
        nome: esp.categoria,
        tipo_campeonato: TIPO_CAMPEONATO_ESPECIAL,
        tipo_marcha: marcha,
        categoria: esp.categoria,
      })
    }
  }
  return linhas
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const tipo_campeonato = req.nextUrl.searchParams.get('tipo_campeonato')
  const tipo_marcha = req.nextUrl.searchParams.get('tipo_marcha')
  const categoria = req.nextUrl.searchParams.get('categoria')

  if (!tipo_campeonato || !tipo_marcha || !categoria) {
    const [{ data: campeonatos }, { data: resultados }, { data: composicaoEspeciais }] = await Promise.all([
      supabase.from('nm_campeonatos').select('*').order('categoria'),
      supabase.from('nm_resultados').select('tipo_campeonato, tipo_marcha, categoria, colocacao, origem').eq('tipo_prova', 'final'),
      supabase.from('nm_campeoes_dos_campeoes').select('tipo, tipo_marcha, num_catalogo'),
    ])
    const especiais = campeonatosEspeciais()
    const todosCampeonatos = [...(campeonatos || []), ...especiais]

    // Quantos animais cada Grande Campeonato/Campeao dos Campeoes tem hoje
    // (montado na aba Campeoes) - usado so pro contador "registrados/total"
    // dos pendentes, junto dos de verdade (que vem com total_animais pronto
    // de nm_campeonatos).
    const totalPorTipoMarcha = new Map<string, number>()
    for (const c of composicaoEspeciais || []) {
      const key = `${c.tipo}|${c.tipo_marcha}`
      totalPorTipoMarcha.set(key, (totalPorTipoMarcha.get(key) || 0) + 1)
    }

    // "Pendente" = essa categoria+marcha ainda NAO tem nenhum resultado
    // OFICIAL (origem 'abccmm') importado - so notas zeradas ou so
    // cadastradas na mao ate agora. Assim que a sincronizacao trouxer
    // qualquer oficial pra ela, some da lista (a sincronizacao automatica
    // toma conta do resto sozinha, nao precisa mais de acompanhamento manual).
    const registrados = new Map<string, number>()
    const temOficial = new Set<string>()
    for (const r of resultados || []) {
      const key = `${r.tipo_campeonato}|${r.tipo_marcha}|${r.categoria}`
      if (r.colocacao) registrados.set(key, (registrados.get(key) || 0) + 1)
      if (r.origem === 'abccmm') temOficial.add(key)
    }
    const pendentes = todosCampeonatos
      .filter(c => !temOficial.has(`${c.tipo_campeonato}|${c.tipo_marcha}|${c.categoria}`))
      .map(c => {
        const key = `${c.tipo_campeonato}|${c.tipo_marcha}|${c.categoria}`
        const especial = tipoDaCategoriaEspecial(c.categoria)
        const total_animais = especial ? (totalPorTipoMarcha.get(`${especial}|${c.tipo_marcha}`) || 0) : (c as { total_animais?: number }).total_animais ?? 0
        return { ...c, total_animais, registrados: registrados.get(key) || 0 }
      })
      .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.tipo_marcha.localeCompare(b.tipo_marcha))
    return NextResponse.json({ campeonatos: todosCampeonatos, pendentes })
  }

  const tipoEspecial = tipoDaCategoriaEspecial(categoria)
  const [animaisRes, resultadosRes] = await Promise.all([
    tipoEspecial
      ? supabase.rpc('nm_campeoes_dos_campeoes_listar', { p_tipo: tipoEspecial, p_tipo_marcha: tipo_marcha })
        .then(({ data }) => ({ data: (data || []).map((r: { num_catalogo: string; nome: string }) => ({ id: 0, num_catalogo: r.num_catalogo, nome: r.nome })) }))
      : supabase.from('nm_animais').select('id, num_catalogo, nome')
        .eq('tipo_campeonato', tipo_campeonato).eq('tipo_marcha', tipo_marcha).eq('categoria', categoria)
        .order('num_catalogo'),
    supabase.from('nm_resultados')
      .select('num_catalogo, nome_animal, pontuacao_funcional, pontuacao_morfologia, pontuacao_andamento, colocacao, origem')
      .eq('tipo_campeonato', tipo_campeonato).eq('tipo_marcha', tipo_marcha).eq('categoria', categoria).eq('tipo_prova', 'final'),
  ])

  const animaisOrdenados = tipoEspecial
    ? [...animaisRes.data].sort((a, b) => (parseInt(a.num_catalogo, 10) || 0) - (parseInt(b.num_catalogo, 10) || 0))
    : animaisRes.data || []

  return NextResponse.json({ animais: animaisOrdenados, resultados: resultadosRes.data || [] })
}

type LinhaManual = {
  num_catalogo: string
  nome_animal?: string | null
  pontuacao_funcional?: string | null
  pontuacao_morfologia?: string | null
  pontuacao_andamento?: string | null
  colocacao?: string | null
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const body = await req.json()
  const { tipo_campeonato, tipo_marcha, categoria } = body
  const linhas: LinhaManual[] = body.linhas
  if (!tipo_campeonato || !tipo_marcha || !categoria || !Array.isArray(linhas) || linhas.length === 0) {
    return NextResponse.json({ error: 'Campos obrigatorios faltando' }, { status: 400 })
  }

  // Confere quais dessas linhas ja tem resultado oficial (abccmm) - o RPC
  // ja ignora a escrita nesse caso, mas o admin precisa saber quais nao rolaram.
  const numCatalogos = linhas.map(l => l.num_catalogo)
  const { data: existentes } = await supabase
    .from('nm_resultados')
    .select('num_catalogo, origem')
    .eq('tipo_campeonato', tipo_campeonato).eq('tipo_marcha', tipo_marcha).eq('categoria', categoria)
    .eq('tipo_prova', 'final')
    .in('num_catalogo', numCatalogos)
  const oficiais = new Set((existentes || []).filter(e => e.origem === 'abccmm').map(e => e.num_catalogo))
  const ignorados = numCatalogos.filter(n => oficiais.has(n))

  const { error } = await supabase.rpc('nm_admin_upsert_resultado_manual', {
    p_rows: linhas.map(l => ({
      tipo_campeonato, tipo_marcha, categoria,
      num_catalogo: l.num_catalogo,
      nome_animal: l.nome_animal || null,
      pontuacao_funcional: l.pontuacao_funcional || null,
      pontuacao_morfologia: l.pontuacao_morfologia || null,
      pontuacao_andamento: l.pontuacao_andamento || null,
      colocacao: l.colocacao || null,
    })),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, salvos: linhas.length - ignorados.length, ignorados })
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

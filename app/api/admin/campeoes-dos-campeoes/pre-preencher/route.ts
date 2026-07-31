import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'
import { normalizarColocacao, normalizarColocacaoPorRank } from '@/lib/colocacao'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'campeoes')
}

const TIPOS_VALIDOS = ['castrado', 'macho', 'femea', 'grande_jovem_macho', 'grande_jovem_femea'] as const
type Tipo = typeof TIPOS_VALIDOS[number]
const MARCHAS_VALIDAS = ['MB', 'MP']

// Deriva o tipo (macho/femea/castrado/grande_jovem_*) de uma categoria de
// verdade a partir do prefixo do nome - mesma convencao ja usada em
// app/page.tsx (ehJovem = /^potr[ao]\b/) pro desempate Morfologia x Prova
// Funcional: Potra/Potro = divisao Jovem (Grande Campeonato Jovem da Raca),
// Egua/Cavalo = adulto, Cavalo Castrado = castrado.
function tipoDaCategoriaReal(categoria: string): Tipo | null {
  const c = categoria.trim()
  if (/^cavalo\s+castrado\b/i.test(c)) return 'castrado'
  if (/^potra\b/i.test(c)) return 'grande_jovem_femea'
  if (/^potro\b/i.test(c)) return 'grande_jovem_macho'
  if (/^[ée]gua\b/i.test(c)) return 'femea'
  if (/^cavalo\b/i.test(c)) return 'macho'
  return null
}

type Motivo = 'campeao_categoria' | 'reservado_categoria' | 'campeao_marcha'

// Calcula quem se classifica pra um dos 5 campeonatos de Campeoes (Art.
// 73-76 do regulamento): o Campeao e o Reservado Campeao de Categoria, mais
// o Campeao de Marcha (quesito isolado, pode ser um animal diferente) de
// cada categoria de verdade que pertence a esse tipo+marcha. So sugere -
// quem decide o que realmente entra na lista e o admin, na tela de revisao.
export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const tipo = req.nextUrl.searchParams.get('tipo')
  const tipoMarcha = req.nextUrl.searchParams.get('tipo_marcha')
  if (!tipo || !TIPOS_VALIDOS.includes(tipo as Tipo) || !tipoMarcha || !MARCHAS_VALIDAS.includes(tipoMarcha)) {
    return NextResponse.json({ error: 'tipo e tipo_marcha sao obrigatorios' }, { status: 400 })
  }

  const [{ data: resultados }, { data: listaAtual }] = await Promise.all([
    supabase.from('nm_resultados')
      .select('num_catalogo, categoria, colocacao, pontuacao_andamento')
      .eq('tipo_marcha', tipoMarcha).eq('tipo_prova', 'final'),
    supabase.rpc('nm_campeoes_dos_campeoes_listar', { p_tipo: tipo, p_tipo_marcha: tipoMarcha }),
  ])

  const jaNaLista = new Set((listaAtual || []).map((a: { num_catalogo: string }) => a.num_catalogo))

  const porCatalogo = new Map<string, { motivos: Set<Motivo>; categoria: string }>()
  for (const r of resultados || []) {
    if (tipoDaCategoriaReal(r.categoria) !== tipo) continue
    const motivos: Motivo[] = []
    const colocacao = normalizarColocacao(r.colocacao)
    if (colocacao?.ordem === 1) motivos.push('campeao_categoria')
    if (colocacao?.ordem === 2) motivos.push('reservado_categoria')
    if (normalizarColocacaoPorRank(r.pontuacao_andamento)?.ordem === 1) motivos.push('campeao_marcha')
    if (motivos.length === 0) continue

    const existente = porCatalogo.get(r.num_catalogo)
    if (existente) motivos.forEach(m => existente.motivos.add(m))
    else porCatalogo.set(r.num_catalogo, { motivos: new Set(motivos), categoria: r.categoria })
  }

  if (porCatalogo.size === 0) return NextResponse.json({ candidatos: [] })

  const { data: animaisInfo } = await supabase
    .from('nm_animais')
    .select('num_catalogo, nome, haras')
    .in('num_catalogo', [...porCatalogo.keys()])
  const infoPorCatalogo = new Map((animaisInfo || []).map(a => [a.num_catalogo, a]))

  const candidatos = [...porCatalogo.entries()]
    .map(([num_catalogo, v]) => ({
      num_catalogo,
      nome: infoPorCatalogo.get(num_catalogo)?.nome || '(animal não encontrado no catálogo)',
      haras: infoPorCatalogo.get(num_catalogo)?.haras || null,
      categoria: v.categoria,
      motivos: [...v.motivos],
      ja_na_lista: jaNaLista.has(num_catalogo),
    }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || (parseInt(a.num_catalogo, 10) || 0) - (parseInt(b.num_catalogo, 10) || 0))

  return NextResponse.json({ candidatos })
}

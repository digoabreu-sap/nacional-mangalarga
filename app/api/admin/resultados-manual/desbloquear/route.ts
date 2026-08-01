import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'resultados')
}

// Paliativo pra quando a ABCCMM publica uma linha "oficial" vazia (sem
// nenhuma nota) - rebaixa ela de volta pra origem='manual' pra liberar a
// edicao no cadastro manual. Assim que a sincronizacao trouxer o resultado
// de verdade, volta a ser oficial e trava de novo (o paliativo nunca
// compete com o oficial real).
//
// Sem num_catalogo, destrava TODAS as linhas vazias da categoria+marcha de
// uma vez - pra quando o roster inteiro veio oficial vazio (ex: 16 animais
// de "Cavalo Castrado Adulto (MB)") e destravar um por um antes de
// importar o Resumo Parcial/PDF nao e viavel.
export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { tipo_campeonato, tipo_marcha, categoria, num_catalogo } = await req.json()
  if (!tipo_campeonato || !tipo_marcha || !categoria) {
    return NextResponse.json({ error: 'Campos obrigatorios faltando' }, { status: 400 })
  }

  if (num_catalogo) {
    const { error } = await supabase.rpc('nm_admin_desbloquear_resultado_oficial', {
      p_tipo_campeonato: tipo_campeonato,
      p_tipo_marcha: tipo_marcha,
      p_categoria: categoria,
      p_num_catalogo: num_catalogo,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, desbloqueados: 1 })
  }

  const { data, error } = await supabase.rpc('nm_admin_desbloquear_resultados_oficiais_vazios_categoria', {
    p_tipo_campeonato: tipo_campeonato,
    p_tipo_marcha: tipo_marcha,
    p_categoria: categoria,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, desbloqueados: data ?? 0 })
}

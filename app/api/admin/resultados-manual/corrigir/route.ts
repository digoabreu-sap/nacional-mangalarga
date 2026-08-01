import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'resultados')
}

// Corrige um campo especifico de um resultado JA OFICIAL (diferente do
// cadastro manual normal, que nunca sobrescreve origem='abccmm') - usado
// pela ferramenta de divergencias, quando o admin decide que o Resumo
// Parcial esta certo e o oficial sincronizado esta errado. Mantem
// origem='abccmm' (continua contando como oficial, so com o valor certo).
export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { tipo_campeonato, tipo_marcha, categoria, num_catalogo, campo, valor } = await req.json()
  if (!tipo_campeonato || !tipo_marcha || !categoria || !num_catalogo || !campo || !valor) {
    return NextResponse.json({ error: 'Campos obrigatorios faltando' }, { status: 400 })
  }
  if (campo !== 'colocacao' && campo !== 'pontuacao_andamento') {
    return NextResponse.json({ error: 'Campo invalido' }, { status: 400 })
  }

  const rpc = campo === 'colocacao' ? 'nm_admin_corrigir_colocacao_oficial' : 'nm_admin_corrigir_marcha_oficial'
  const paramValor = campo === 'colocacao' ? { p_colocacao: valor } : { p_pontuacao_andamento: valor }
  const { error } = await supabase.rpc(rpc, {
    p_tipo_campeonato: tipo_campeonato,
    p_tipo_marcha: tipo_marcha,
    p_categoria: categoria,
    p_num_catalogo: num_catalogo,
    ...paramValor,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}

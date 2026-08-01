import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'resultados')
}

// Todos os resultados OFICIAIS (origem='abccmm') de uma vez, sem filtro de
// categoria - usado pela ferramenta de divergencias (compara contra o
// Resumo Parcial, que cobre o evento inteiro num PDF so).
export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('nm_resultados')
    .select('tipo_campeonato, tipo_marcha, categoria, num_catalogo, nome_animal, colocacao, pontuacao_andamento')
    .eq('tipo_prova', 'final')
    .eq('origem', 'abccmm')
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ oficiais: data ?? [] })
}

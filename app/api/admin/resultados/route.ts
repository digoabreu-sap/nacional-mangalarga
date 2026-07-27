import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { refreshAllResults } from '@/lib/resultados-abccmm'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

// Scraping de todas as classes/provas pode passar de 1 minuto.
export const maxDuration = 300

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'resultados')
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { data } = await supabase.rpc('nm_get_resultados_sync')
  const status = Array.isArray(data) ? data[0] : data
  return NextResponse.json(status || null)
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const resumo = await refreshAllResults()
  await supabase.rpc('nm_admin_set_resultados_sync', {
    p_classes: resumo.classesProcessadas,
    p_linhas: resumo.linhasAtualizadas,
    p_erro: resumo.erros.length ? resumo.erros.slice(0, 30).join(' | ') : null,
  })

  return NextResponse.json(resumo)
}

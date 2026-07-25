import { NextRequest, NextResponse } from 'next/server'
import { refreshAllResults } from '@/lib/resultados-abccmm'
import { supabase } from '@/lib/supabase'

// Scraping de todas as classes/provas pode passar de 1 minuto; 300s e o
// teto do plano Pro da Vercel (Hobby fica limitado a 60s mesmo se pedir mais).
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  const resumo = await refreshAllResults()
  await supabase.rpc('nm_admin_set_resultados_sync', {
    p_classes: resumo.classesProcessadas,
    p_linhas: resumo.linhasAtualizadas,
    p_erro: resumo.erros.length ? resumo.erros.slice(0, 30).join(' | ') : null,
  })

  return NextResponse.json(resumo)
}

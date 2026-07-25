export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  // Na Vercel (serverless) nao existe processo long-running pra manter um
  // setInterval vivo - cada invocacao roda numa funcao efemera. La, a
  // sincronizacao periodica e feita por um Vercel Cron Job chamando
  // /api/cron/resultados. Isto aqui so serve pra deploy em servidor
  // long-running (VPS/Docker).
  if (process.env.VERCEL) return

  const { refreshAllResults } = await import('@/lib/resultados-abccmm')
  const { supabase } = await import('@/lib/supabase')

  const INTERVALO_MS = 15 * 60 * 1000

  async function sincronizar() {
    try {
      const resumo = await refreshAllResults()
      await supabase.rpc('nm_admin_set_resultados_sync', {
        p_classes: resumo.classesProcessadas,
        p_linhas: resumo.linhasAtualizadas,
        p_erro: resumo.erros.length ? resumo.erros.slice(0, 10).join(' | ') : null,
      })
    } catch (e) {
      console.error('Falha na sincronizacao periodica de resultados:', e)
    }
  }

  sincronizar()
  setInterval(sincronizar, INTERVALO_MS)
}
